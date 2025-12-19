import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
    WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '../config/config.service';
import { UserService } from '../user/user.service';
import { RoomMessageDto, PrivateMessageDto, JoinRoomDto } from './chat-gateway.dto';

interface AuthenticatedSocket extends Socket {
    user: {
        id: string;
        email: string;
        username: string;
    };
}

@WebSocketGateway({
    cors: {
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl)
            if (!origin) {
                callback(null, true);
                return;
            }
            // Allow localhost:3000 for development
            if (origin === 'http://localhost:3000' || origin.includes('azurewebsites.net')) {
                callback(null, true);
            } else {
                callback(new Error('Origin not allowed'), false);
            }
        },
        methods: ['GET', 'POST'],
    },
})
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(ChatGateway.name);
    private readonly socketRooms = new Map<string, Set<string>>();
    private readonly authenticatedUsers = new Map<string, { id: string; username: string }>();

    constructor(
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
        private readonly userService: UserService,
    ) { }

    async handleConnection(client: Socket): Promise<void> {
        try {
            // Extract JWT token from handshake
            const token = this.extractToken(client);

            if (!token) {
                this.logger.warn(`Connection rejected: No token provided (${client.id})`);
                client.emit('error', { message: 'Authentication required' });
                client.disconnect();
                return;
            }

            // Verify JWT token
            const payload = await this.verifyToken(token);

            if (!payload) {
                this.logger.warn(`Connection rejected: Invalid token (${client.id})`);
                client.emit('error', { message: 'Invalid or expired token' });
                client.disconnect();
                return;
            }

            // Verify user exists in database
            const user = await this.userService.findById(payload.sub);

            if (!user) {
                this.logger.warn(`Connection rejected: User not found (${client.id})`);
                client.emit('error', { message: 'User not found' });
                client.disconnect();
                return;
            }

            // Store authenticated user info
            (client as AuthenticatedSocket).user = {
                id: user.id,
                email: user.email,
                username: user.username,
            };

            this.socketRooms.set(client.id, new Set());
            this.authenticatedUsers.set(client.id, { id: user.id, username: user.username });

            this.logger.log(`User connected: ${user.username} (${client.id})`);
            client.emit('authenticated', { message: 'Successfully authenticated', userId: user.id });

        } catch (error) {
            this.logger.error(`Connection error: ${error.message}`);
            client.emit('error', { message: 'Authentication failed' });
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket): void {
        const userInfo = this.authenticatedUsers.get(client.id);
        this.socketRooms.delete(client.id);
        this.authenticatedUsers.delete(client.id);
        this.logger.log(`User disconnected: ${userInfo?.username || 'unknown'} (${client.id})`);
    }

    @SubscribeMessage('joinRoom')
    handleJoinRoom(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() payload: JoinRoomDto,
    ): void {
        if (!this.isAuthenticated(client)) {
            throw new WsException('Not authenticated');
        }

        const room = this.sanitizeInput(payload.room);
        client.join(room);
        this.socketRooms.get(client.id)?.add(room);

        this.server
            .to(room)
            .emit('message', {
                type: 'system',
                content: `${client.user.username} joined room "${room}"`,
                timestamp: new Date().toISOString(),
            });
    }

    @SubscribeMessage('leaveRoom')
    handleLeaveRoom(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() payload: JoinRoomDto,
    ): void {
        if (!this.isAuthenticated(client)) {
            throw new WsException('Not authenticated');
        }

        const rooms = this.socketRooms.get(client.id);
        const room = this.sanitizeInput(payload.room);

        if (!rooms?.has(room)) {
            client.emit('error', { message: `You are not in room "${room}"` });
            return;
        }

        client.leave(room);
        rooms.delete(room);

        this.server
            .to(room)
            .emit('message', {
                type: 'system',
                content: `${client.user.username} left room "${room}"`,
                timestamp: new Date().toISOString(),
            });

        client.emit('message', {
            type: 'system',
            content: `You left room "${room}"`,
            timestamp: new Date().toISOString(),
        });
    }

    @SubscribeMessage('roomMessage')
    handleRoomMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() payload: RoomMessageDto,
    ): void {
        if (!this.isAuthenticated(client)) {
            throw new WsException('Not authenticated');
        }

        const rooms = this.socketRooms.get(client.id);
        const room = this.sanitizeInput(payload.room);

        if (!rooms?.has(room)) {
            client.emit('error', { message: `You are not in room "${room}"!` });
            return;
        }

        const sanitizedMessage = this.sanitizeInput(payload.message);

        this.server
            .to(room)
            .emit('message', {
                type: 'room',
                room: room,
                sender: client.user.username,
                senderId: client.user.id,
                content: sanitizedMessage,
                timestamp: new Date().toISOString(),
            });
    }

    @SubscribeMessage('privateMessage')
    handlePrivateMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() payload: PrivateMessageDto,
    ): void {
        if (!this.isAuthenticated(client)) {
            throw new WsException('Not authenticated');
        }

        const target = this.server.sockets.sockets.get(payload.targetId);

        if (!target) {
            client.emit('error', { message: `Target user not found or offline` });
            return;
        }

        const sanitizedMessage = this.sanitizeInput(payload.message);

        target.emit('message', {
            type: 'private',
            sender: client.user.username,
            senderId: client.user.id,
            content: sanitizedMessage,
            timestamp: new Date().toISOString(),
        });

        client.emit('message', {
            type: 'private-sent',
            targetId: payload.targetId,
            content: sanitizedMessage,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Extract JWT token from socket handshake
     */
    private extractToken(client: Socket): string | null {
        // Try auth object first (recommended for socket.io)
        const authToken = client.handshake.auth?.token;
        if (authToken) {
            return authToken;
        }

        // Fallback to Authorization header
        const authHeader = client.handshake.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        return null;
    }

    /**
     * Verify JWT token and return payload
     */
    private async verifyToken(token: string): Promise<{ sub: string; email: string; username: string } | null> {
        try {
            const payload = await this.jwtService.verifyAsync(token);
            return payload;
        } catch (error) {
            this.logger.debug(`Token verification failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Check if client is authenticated
     */
    private isAuthenticated(client: AuthenticatedSocket): boolean {
        return !!client.user?.id;
    }

    /**
     * Sanitize user input to prevent XSS
     */
    private sanitizeInput(input: string): string {
        if (!input || typeof input !== 'string') {
            return '';
        }

        // Basic HTML entity encoding to prevent XSS
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .trim();
    }
}

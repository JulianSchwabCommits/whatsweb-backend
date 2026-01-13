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
import { MaxLength, MinLength } from 'class-validator';
import { UserService } from '../user/user.service';

// ─── Types ───────────────────────────────────────────────────────────────────
interface AuthenticatedSocket extends Socket {
    user: { id: string; email: string; username: string };
}

interface JwtPayload {
    sub: string;
    email: string;
    username: string;
}

// ─── DTOs ────────────────────────────────────────────────────────────────────
class JoinRoomDto {
    @MinLength(1) @MaxLength(100)
    room: string;
}

class RoomMessageDto extends JoinRoomDto {
    @MinLength(1) @MaxLength(2000)
    message: string;
}

class DirectMessageDto {
    @MinLength(1) @MaxLength(50)
    targetUsername: string;

    @MinLength(1) @MaxLength(2000)
    message: string;
}

class DirectMessageDto {
    @MinLength(1)
    targetId: string;

    @MinLength(1) @MaxLength(5000)
    message: string;
}

// ─── Utils ───────────────────────────────────────────────────────────────────
const extractToken = (client: Socket): string | null =>
    client.handshake.auth?.token ||
    (client.handshake.headers?.authorization?.startsWith('Bearer ')
        ? client.handshake.headers.authorization.substring(7)
        : null);

const sanitize = (s: string): string =>
    s?.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#x27;').trim() || '';

// ─── Gateway ─────────────────────────────────────────────────────────────────
@WebSocketGateway({
    cors: {
        origin: (origin: string, cb: (err: Error | null, allow?: boolean) => void) => {
            cb(!origin || origin === 'http://localhost:3000' || origin.includes('azurewebsites.net') ? null : new Error('Origin not allowed'), true);
        },
        methods: ['GET', 'POST'],
        credentials: true,
    },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private readonly logger = new Logger(ChatGateway.name);
    private readonly rooms = new Map<string, Set<string>>();
    private readonly users = new Map<string, { id: string; username: string }>();

    constructor(private readonly jwt: JwtService, private readonly userService: UserService) {}

    async handleConnection(client: Socket): Promise<void> {
        try {
            const token = extractToken(client);
            if (!token) return this.reject(client, 'Authentication required');

            const payload = await this.jwt.verifyAsync<JwtPayload>(token).catch(() => null);
            if (!payload) return this.reject(client, 'Invalid or expired token');

            const user = await this.userService.findById(payload.sub);
            if (!user) return this.reject(client, 'User not found');

            (client as AuthenticatedSocket).user = { id: user.id, email: user.email, username: user.username };
            this.rooms.set(client.id, new Set());
            this.users.set(client.id, { id: user.id, username: user.username });

            this.logger.log(`Connected: ${user.username} (${client.id})`);
            client.emit('authenticated', { message: 'Successfully authenticated', userId: user.id });
        } catch {
            this.reject(client, 'Authentication failed');
        }
    }

    handleDisconnect(client: Socket): void {
        const user = this.users.get(client.id);
        this.rooms.delete(client.id);
        this.users.delete(client.id);
        this.logger.log(`Disconnected: ${user?.username || 'unknown'} (${client.id})`);
    }

    @SubscribeMessage('joinRoom')
    joinRoom(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() { room }: JoinRoomDto): void {
        this.auth(client);
        const r = sanitize(room);
        client.join(r);
        this.rooms.get(client.id)?.add(r);
        this.system(r, `${client.user.username} joined room "${r}"`);
    }

    @SubscribeMessage('leaveRoom')
    leaveRoom(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() { room }: JoinRoomDto): void {
        this.auth(client);
        const r = sanitize(room);
        const set = this.rooms.get(client.id);
        if (!set?.has(r)) return void client.emit('error', { message: `You are not in room "${r}"` });

        client.leave(r);
        set.delete(r);
        this.system(r, `${client.user.username} left room "${r}"`);
        client.emit('message', { type: 'system', content: `You left room "${r}"`, timestamp: new Date().toISOString() });
    }

    @SubscribeMessage('roomMessage')
    roomMessage(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() { room, message }: RoomMessageDto): void {
        this.auth(client);
        const r = sanitize(room);
        if (!this.rooms.get(client.id)?.has(r)) return void client.emit('error', { message: `You are not in room "${r}"!` });

        this.server.to(r).emit('message', {
            type: 'room', room: r, sender: client.user.username, senderId: client.user.id,
            content: sanitize(message), timestamp: new Date().toISOString(),
        });
    }

    @SubscribeMessage('directMessage')
    async directMessage(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() { targetUsername, message }: DirectMessageDto): Promise<void> {
        this.auth(client);
        
        const username = sanitize(targetUsername);
        
        // First check if user exists in database
        const targetUser = await this.userService.findByUsername(username);
        if (!targetUser) {
            return void client.emit('error', { message: `User '${username}' does not exist`, code: 'USER_NOT_FOUND' });
        }
        
        // Then check if user is online
        let targetSocket: Socket | null = null;
        for (const [socketId, userData] of this.users.entries()) {
            if (userData.username === username) {
                targetSocket = this.server.sockets.sockets.get(socketId) || null;
                break;
            }
        }
        
        if (!targetSocket) {
            return void client.emit('error', { message: `User '${username}' is not online`, code: 'USER_OFFLINE' });
        }

        const content = sanitize(message), ts = new Date().toISOString();
        targetSocket.emit('directMessage', { type: 'private', sender: client.user.username, senderId: client.user.id, content, timestamp: ts });
        client.emit('directMessage', { type: 'private-sent', targetUsername: username, content, timestamp: ts });
    }

    @SubscribeMessage('directMessage')
    handleDirectMessage(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { targetId: string; message: string }): void {
        console.log('[DM] Received from:', client.id, 'to:', data.targetId, 'message:', data.message);
        
        const payload = {
            content: data.message,
            from: client.id,
            timestamp: new Date().toISOString(),
        };
        
        // Send to the target user
        this.server.to(data.targetId).emit('directMessage', payload);
        
        // Echo back to sender
        client.emit('directMessage', payload);
        
        console.log('[DM] Sent to:', data.targetId);
    }

    private reject(client: Socket, msg: string): void {
        this.logger.warn(`Rejected: ${msg} (${client.id})`);
        client.emit('error', { message: msg });
        client.disconnect();
    }

    private auth(client: AuthenticatedSocket): void {
        if (!client.user?.id) throw new WsException('Not authenticated');
    }

    private system(room: string, content: string): void {
        this.server.to(room).emit('message', { type: 'system', content, timestamp: new Date().toISOString() });
    }
}

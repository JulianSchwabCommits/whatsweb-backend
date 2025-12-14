import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { RoomMessagePayload, PrivateMessagePayload } from '../types/socket.type';

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
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(ChatGateway.name);
    private readonly socketRooms = new Map<string, Set<string>>();

    constructor(private readonly configService: ConfigService) { }

    handleConnection(client: Socket): void {
        this.socketRooms.set(client.id, new Set());
        this.logger.log(`User connected: ${client.id}`);
    }

    handleDisconnect(client: Socket): void {
        this.socketRooms.delete(client.id);
        this.logger.log(`User disconnected: ${client.id}`);
    }

    @SubscribeMessage('joinRoom')
    handleJoinRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() room: string,
    ): void {
        client.join(room);
        this.socketRooms.get(client.id)?.add(room);
        this.server
            .to(room)
            .emit('message', `${client.id.substring(0, 2)} joined room "${room}"`);
    }

    @SubscribeMessage('leaveRoom')
    handleLeaveRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() room: string,
    ): void {
        const rooms = this.socketRooms.get(client.id);

        if (!rooms?.has(room)) {
            client.emit('message', `You are not in room "${room}"`);
            return;
        }

        client.leave(room);
        rooms.delete(room);
        this.server
            .to(room)
            .emit('message', `${client.id.substring(0, 2)} left room "${room}"`);
        client.emit('message', `You left room "${room}"`);
    }

    @SubscribeMessage('roomMessage')
    handleRoomMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: RoomMessagePayload,
    ): void {
        const rooms = this.socketRooms.get(client.id);

        if (!rooms?.has(payload.room)) {
            client.emit('message', `You are not in room "${payload.room}"!`);
            return;
        }

        this.server
            .to(payload.room)
            .emit(
                'message',
                `[${payload.room}] ${client.id.substring(0, 2)}: ${payload.message}`,
            );
    }

    @SubscribeMessage('privateMessage')
    handlePrivateMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: PrivateMessagePayload,
    ): void {
        const target = this.server.sockets.sockets.get(payload.targetId);

        if (!target) {
            client.emit('message', `Target ${payload.targetId} not found`);
            return;
        }

        target.emit(
            'message',
            `${client.id.substring(0, 2)} (private): ${payload.message}`,
        );
        client.emit('message', `Message sent to ${payload.targetId}`);
    }
}

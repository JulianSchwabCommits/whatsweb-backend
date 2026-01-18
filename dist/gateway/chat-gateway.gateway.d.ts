import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
interface AuthenticatedSocket extends Socket {
    user: {
        id: string;
        email: string;
        username: string;
    };
}
declare class JoinRoomDto {
    room: string;
}
declare class RoomMessageDto extends JoinRoomDto {
    message: string;
}
declare class DirectMessageDto {
    targetUsername: string;
    message: string;
}
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwt;
    private readonly userService;
    server: Server;
    private readonly logger;
    private readonly rooms;
    private readonly users;
    private readonly socketsByUserId;
    constructor(jwt: JwtService, userService: UserService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    joinRoom(client: AuthenticatedSocket, { room }: JoinRoomDto): void;
    leaveRoom(client: AuthenticatedSocket, { room }: JoinRoomDto): void;
    roomMessage(client: AuthenticatedSocket, { room, message }: RoomMessageDto): void;
    directMessage(client: AuthenticatedSocket, { targetUsername, message }: DirectMessageDto): Promise<void>;
    private reject;
    private auth;
    private system;
    private addUserSocket;
    private removeUserSocket;
}
export {};

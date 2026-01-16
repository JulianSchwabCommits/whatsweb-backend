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
import { Logger, ValidationPipe, UsePipes } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MaxLength, MinLength } from 'class-validator';
import { UserService } from '../user/user.service';

// ─── Types ─────────────────────────────
interface AuthenticatedSocket extends Socket {
  user: { id: string; email: string; username: string };
}

interface JwtPayload {
  sub: string;
  email: string;
  username: string;
}

// ─── DTOs ──────────────────────────────
class JoinRoomDto {
  @MinLength(1) @MaxLength(100) room: string;
}

class RoomMessageDto extends JoinRoomDto {
  @MinLength(1) @MaxLength(2000) message: string;
}

class DirectMessageDto {
  @MinLength(1) @MaxLength(50) targetUsername: string;
  @MinLength(1) @MaxLength(2000) message: string;
}

// ─── Utils ─────────────────────────────
const extractToken = (client: Socket): string | null => {
  if (client.handshake.auth?.token) return client.handshake.auth.token;
  
  const authHeader = client.handshake.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

const sanitize = (s: string) =>
  s?.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim() || '';

const timestamp = () => new Date().toISOString();

// ─── Gateway ───────────────────────────
@WebSocketGateway({
  cors: {
    origin: (origin, cb) => {
      cb(
        !origin || origin === 'http://localhost:3000' || origin.includes('azurewebsites.net')
          ? null
          : new Error('Origin not allowed'),
        true
      );
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
  private readonly socketsByUserId = new Map<string, Set<string>>();

  constructor(private readonly jwt: JwtService, private readonly userService: UserService) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = extractToken(client);
    if (!token) return this.reject(client, 'Authentication required');

    const payload = await this.jwt.verifyAsync<JwtPayload>(token).catch(() => null);
    if (!payload) return this.reject(client, 'Invalid or expired token');

    const user = await this.userService.findById(payload.sub);
    if (!user) return this.reject(client, 'User not found');

    (client as AuthenticatedSocket).user = { id: user.id, email: user.email, username: user.username };
    this.rooms.set(client.id, new Set());
    this.users.set(client.id, { id: user.id, username: user.username });
    this.addUserSocket(user.id, client.id);

    this.logger.log(`Connected: ${user.username} (${client.id})`);
    client.emit('authenticated', { message: 'Successfully authenticated', userId: user.id });
  }

  handleDisconnect(client: Socket): void {
    const user = this.users.get(client.id);
    this.rooms.delete(client.id);
    this.users.delete(client.id);
    if (user) this.removeUserSocket(user.id, client.id);
    this.logger.log(`Disconnected: ${user?.username || 'unknown'} (${client.id})`);
  }

  @SubscribeMessage('joinRoom')
  joinRoom(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() { room }: JoinRoomDto): void {
    this.ensureAuth(client);
    const r = sanitize(room);
    client.join(r);
    this.rooms.get(client.id)?.add(r);
    this.broadcastSystem(r, `${client.user.username} joined room "${r}"`);
  }

  @SubscribeMessage('leaveRoom')
  leaveRoom(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() { room }: JoinRoomDto): void {
    this.ensureAuth(client);
    const r = sanitize(room);
    const userRooms = this.rooms.get(client.id);
    if (!userRooms?.has(r)) {
      client.emit('error', { message: `You are not in room "${r}"` });
      return;
    }

    client.leave(r);
    userRooms.delete(r);
    this.broadcastSystem(r, `${client.user.username} left room "${r}"`);
    client.emit('message', { type: 'system', content: `You left room "${r}"`, timestamp: timestamp() });
  }

  @SubscribeMessage('roomMessage')
  roomMessage(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() { room, message }: RoomMessageDto): void {
    this.ensureAuth(client);
    const r = sanitize(room);
    if (!this.rooms.get(client.id)?.has(r)) {
      client.emit('error', { message: `You are not in room "${r}"!` });
      return;
    }

    this.server.to(r).emit('message', {
      type: 'room',
      room: r,
      sender: client.user.username,
      senderId: client.user.id,
      content: sanitize(message),
      timestamp: timestamp(),
    });
  }

  @SubscribeMessage('directMessage')
  async directMessage(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() { targetUsername, message }: DirectMessageDto): Promise<void> {
    this.ensureAuth(client);

    const username = sanitize(targetUsername);
    const targetEntry = Array.from(this.users.entries()).find(([_, u]) => u.username === username);

    if (!targetEntry) {
      client.emit('error', { message: `User '${username}' is not online`, code: 'USER_OFFLINE' });
      return;
    }

    const [_, targetUser] = targetEntry;
    const socketIds = this.socketsByUserId.get(targetUser.id);
    if (!socketIds?.size) {
      client.emit('error', { message: `User '${username}' is not online`, code: 'USER_OFFLINE' });
      return;
    }

    const content = sanitize(message);
    for (const socketId of socketIds) {
      const sock = this.server.sockets.sockets.get(socketId);
      sock?.emit('directMessage', { type: 'private', sender: client.user.username, senderId: client.user.id, content, timestamp: timestamp() });
    }

    client.emit('directMessage', { type: 'private-sent', targetUsername: username, content, timestamp: timestamp() });
  }

  // ─── Helpers ─────────────────────────
  private reject(client: Socket, msg: string): void {
    this.logger.warn(`Rejected: ${msg} (${client.id})`);
    client.emit('error', { message: msg });
    client.disconnect();
  }

  private ensureAuth(client: AuthenticatedSocket): void {
    if (!client.user?.id) throw new WsException('Not authenticated');
  }

  private broadcastSystem(room: string, content: string): void {
    this.server.to(room).emit('message', { type: 'system', content, timestamp: timestamp() });
  }

  private addUserSocket(userId: string, socketId: string): void {
    const set = this.socketsByUserId.get(userId) || new Set<string>();
    set.add(socketId);
    this.socketsByUserId.set(userId, set);
  }

  private removeUserSocket(userId: string, socketId: string): void {
    const set = this.socketsByUserId.get(userId);
    if (!set) return;
    set.delete(socketId);
    if (!set.size) this.socketsByUserId.delete(userId);
  }
}

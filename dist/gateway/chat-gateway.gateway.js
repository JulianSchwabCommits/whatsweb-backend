"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ChatGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const class_validator_1 = require("class-validator");
const user_service_1 = require("../user/user.service");
class JoinRoomDto {
    room;
}
__decorate([
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], JoinRoomDto.prototype, "room", void 0);
class RoomMessageDto extends JoinRoomDto {
    message;
}
__decorate([
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], RoomMessageDto.prototype, "message", void 0);
class DirectMessageDto {
    targetUsername;
    message;
}
__decorate([
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], DirectMessageDto.prototype, "targetUsername", void 0);
__decorate([
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], DirectMessageDto.prototype, "message", void 0);
const extractToken = (client) => client.handshake.auth?.token ||
    (client.handshake.headers?.authorization?.startsWith('Bearer ')
        ? client.handshake.headers.authorization.substring(7)
        : null);
const sanitize = (s) => s?.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;').trim() || '';
const normalizeName = (s) => s?.trim() || '';
let ChatGateway = ChatGateway_1 = class ChatGateway {
    jwt;
    userService;
    server;
    logger = new common_1.Logger(ChatGateway_1.name);
    rooms = new Map();
    users = new Map();
    socketsByUserId = new Map();
    constructor(jwt, userService) {
        this.jwt = jwt;
        this.userService = userService;
    }
    async handleConnection(client) {
        try {
            const token = extractToken(client);
            if (!token)
                return this.reject(client, 'Authentication required');
            const payload = await this.jwt.verifyAsync(token).catch(() => null);
            if (!payload)
                return this.reject(client, 'Invalid or expired token');
            const user = await this.userService.findById(payload.sub);
            if (!user)
                return this.reject(client, 'User not found');
            client.user = { id: user.id, email: user.email, username: user.username };
            this.rooms.set(client.id, new Set());
            const userInfo = { id: user.id, username: user.username };
            this.users.set(client.id, userInfo);
            this.addUserSocket(userInfo.id, client.id);
            this.logger.log(`Connected: ${user.username} (${client.id})`);
            client.emit('authenticated', { message: 'Successfully authenticated', userId: user.id });
        }
        catch {
            this.reject(client, 'Authentication failed');
        }
    }
    handleDisconnect(client) {
        const user = this.users.get(client.id);
        this.rooms.delete(client.id);
        this.users.delete(client.id);
        if (user)
            this.removeUserSocket(user.id, client.id);
        this.logger.log(`Disconnected: ${user?.username || 'unknown'} (${client.id})`);
    }
    joinRoom(client, { room }) {
        this.auth(client);
        const r = sanitize(room);
        client.join(r);
        this.rooms.get(client.id)?.add(r);
        this.system(r, `${client.user.username} joined room "${r}"`);
    }
    leaveRoom(client, { room }) {
        this.auth(client);
        const r = sanitize(room);
        const set = this.rooms.get(client.id);
        if (!set?.has(r))
            return void client.emit('error', { message: `You are not in room "${r}"` });
        client.leave(r);
        set.delete(r);
        this.system(r, `${client.user.username} left room "${r}"`);
        client.emit('message', { type: 'system', content: `You left room "${r}"`, timestamp: new Date().toISOString() });
    }
    roomMessage(client, { room, message }) {
        this.auth(client);
        const r = sanitize(room);
        if (!this.rooms.get(client.id)?.has(r))
            return void client.emit('error', { message: `You are not in room "${r}"!` });
        this.server.to(r).emit('message', {
            type: 'room', room: r, sender: client.user.username, senderId: client.user.id,
            content: sanitize(message), timestamp: new Date().toISOString(),
        });
    }
    async directMessage(client, { targetUsername, message }) {
        this.auth(client);
        const username = normalizeName(targetUsername);
        const targetUser = await this.userService.findByUsername(username);
        if (!targetUser) {
            return void client.emit('error', { message: `User '${username}' does not exist`, code: 'USER_NOT_FOUND' });
        }
        const socketIds = this.socketsByUserId.get(targetUser.id);
        if (!socketIds || socketIds.size === 0) {
            return void client.emit('error', { message: `User '${username}' is not online`, code: 'USER_OFFLINE' });
        }
        const content = sanitize(message), ts = new Date().toISOString();
        for (const socketId of socketIds) {
            const targetSocket = this.server.sockets.sockets.get(socketId);
            if (targetSocket) {
                targetSocket.emit('directMessage', { type: 'private', sender: client.user.username, senderId: client.user.id, content, timestamp: ts });
            }
        }
        client.emit('directMessage', { type: 'private-sent', targetUsername: username, content, timestamp: ts });
    }
    reject(client, msg) {
        this.logger.warn(`Rejected: ${msg} (${client.id})`);
        client.emit('error', { message: msg });
        client.disconnect();
    }
    auth(client) {
        if (!client.user?.id)
            throw new websockets_1.WsException('Not authenticated');
    }
    system(room, content) {
        this.server.to(room).emit('message', { type: 'system', content, timestamp: new Date().toISOString() });
    }
    addUserSocket(userId, socketId) {
        const set = this.socketsByUserId.get(userId) || new Set();
        set.add(socketId);
        this.socketsByUserId.set(userId, set);
    }
    removeUserSocket(userId, socketId) {
        const set = this.socketsByUserId.get(userId);
        if (!set)
            return;
        set.delete(socketId);
        if (set.size === 0)
            this.socketsByUserId.delete(userId);
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinRoom'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, JoinRoomDto]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "joinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leaveRoom'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, JoinRoomDto]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "leaveRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('roomMessage'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, RoomMessageDto]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "roomMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('directMessage'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, DirectMessageDto]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "directMessage", null);
exports.ChatGateway = ChatGateway = ChatGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: (origin, cb) => {
                cb(!origin || origin === 'http://localhost:3000' || origin.includes('azurewebsites.net') ? null : new Error('Origin not allowed'), true);
            },
            methods: ['GET', 'POST'],
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService, user_service_1.UserService])
], ChatGateway);
//# sourceMappingURL=chat-gateway.gateway.js.map
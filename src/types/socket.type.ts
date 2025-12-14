import { Socket } from 'socket.io';

export class RoomMessagePayload {
    room: string;
    message: string;
}

export class PrivateMessagePayload {
    targetId: string;
    message: string;
}

export interface AuthenticatedSocket extends Socket {
    // Extend if needed for user data
}

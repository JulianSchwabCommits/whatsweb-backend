import { IsString, IsNotEmpty } from 'class-validator';

export class RoomMessageDto {
    @IsString()
    @IsNotEmpty()
    room: string;

    @IsString()
    @IsNotEmpty()
    message: string;
}

export class PrivateMessageDto {
    @IsString()
    @IsNotEmpty()
    targetId: string;

    @IsString()
    @IsNotEmpty()
    message: string;
}

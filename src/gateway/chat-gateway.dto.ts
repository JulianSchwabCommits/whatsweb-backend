import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class JoinRoomDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(100)
    room: string;
}

export class RoomMessageDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(100)
    room: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(2000)
    message: string;
}

export class PrivateMessageDto {
    @IsString()
    @IsNotEmpty()
    targetId: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(2000)
    message: string;
}

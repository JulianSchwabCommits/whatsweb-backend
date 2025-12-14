import { Module } from '@nestjs/common';
import { ChatGateway } from './chat-gateway.gateway.js';

@Module({
    providers: [ChatGateway],
    exports: [ChatGateway],
})
export class ChatGatewayModule { }

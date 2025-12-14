import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from './config/config.module.js';
import { ChatGatewayModule } from './gateway/chat-gateway.module.js';

@Module({
  imports: [ConfigModule, ChatGatewayModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

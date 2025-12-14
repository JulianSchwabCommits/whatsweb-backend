import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { ChatGatewayModule } from './gateway/chat-gateway.module';

@Module({
  imports: [ConfigModule, ChatGatewayModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

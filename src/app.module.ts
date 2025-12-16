import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { ChatGatewayModule } from './gateway/chat-gateway.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [ConfigModule, ChatGatewayModule, SupabaseModule, AuthModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

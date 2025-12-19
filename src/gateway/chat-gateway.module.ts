import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatGateway } from './chat-gateway.gateway';
import { UserModule } from '../user/user.module';

@Module({
    imports: [
        UserModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const secret = configService.get<string>('JWT_SECRET');
                if (!secret) throw new Error('JWT_SECRET must be configured');
                return { secret };
            },
        }),
    ],
    providers: [ChatGateway],
    exports: [ChatGateway],
})
export class ChatGatewayModule { }

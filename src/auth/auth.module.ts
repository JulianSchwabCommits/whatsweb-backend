import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from '../user/user.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [
        UserModule,
        SupabaseModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService): JwtModuleOptions => {
                const secret = configService.get<string>('JWT_SECRET') || 'fallback-secret';
                const expiresIn = configService.get<string>('JWT_EXPIRATION') || '1h';
                return {
                    secret,
                    signOptions: {
                        expiresIn,
                    },
                } as JwtModuleOptions;
            },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy],
    exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule { }

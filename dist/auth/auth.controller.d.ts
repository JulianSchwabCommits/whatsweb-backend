import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ConfigService } from '../config/config.service';
export declare class AuthController {
    private authService;
    private configService;
    constructor(authService: AuthService, configService: ConfigService);
    private setRefreshTokenCookie;
    private clearRefreshTokenCookie;
    register(registerDto: RegisterDto, res: Response): Promise<AuthResponseDto>;
    login(loginDto: LoginDto, res: Response): Promise<AuthResponseDto>;
    refresh(req: Request, res: Response): Promise<{
        accessToken: string;
    }>;
    logout(res: Response): Promise<{
        message: string;
    }>;
    getProfile(user: any): Promise<import("../user/interfaces/user.interface").User | null>;
}

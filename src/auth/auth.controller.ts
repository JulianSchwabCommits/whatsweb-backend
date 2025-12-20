import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Get, Res, Req, UnauthorizedException } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ConfigService } from '../config/config.service';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private configService: ConfigService,
    ) { }

    private setRefreshTokenCookie(res: Response, refreshToken: string): void {
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: this.configService.isProduction,
            sameSite: 'lax',
            path: '/auth/',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
    }

    private clearRefreshTokenCookie(res: Response): void {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: this.configService.isProduction,
            sameSite: 'lax',
            path: '/auth/',
        });
    }

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(
        @Body() registerDto: RegisterDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<AuthResponseDto> {
        const { accessToken, refreshToken, user } = await this.authService.register(registerDto);
        
        this.setRefreshTokenCookie(res, refreshToken);
        
        return { accessToken, user };
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() loginDto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<AuthResponseDto> {
        const { accessToken, refreshToken, user } = await this.authService.login(loginDto);
        
        this.setRefreshTokenCookie(res, refreshToken);
        
        return { accessToken, user };
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<{ accessToken: string }> {
        const refreshToken = (req as any).cookies?.refreshToken;
        
        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token not found');
        }
        
        return this.authService.refreshToken(refreshToken);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logout(
        @Res({ passthrough: true }) res: Response,
    ): Promise<{ message: string }> {
        await this.authService.logout();
        
        this.clearRefreshTokenCookie(res);
        
        return { message: 'Logged out successfully' };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getProfile(@CurrentUser() user: any) {
        return this.authService.validateUser(user.id);
    }
}

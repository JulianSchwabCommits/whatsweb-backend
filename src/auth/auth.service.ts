import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
    constructor(
        private supabaseService: SupabaseService,
        private userService: UserService,
        private jwtService: JwtService,
    ) { }

    async register(registerDto: RegisterDto): Promise<{ accessToken: string; refreshToken: string; user: { id: string; email: string; username: string; fullName: string } }> {
        const { email, password, username, fullName } = registerDto;

        // Check if username is already taken
        const existingUser = await this.userService.findByUsername(username);
        if (existingUser) {
            throw new ConflictException('Username already taken');
        }

        // Register with Supabase Auth
        const { data: authData, error: authError } = await this.supabaseService.auth.signUp({
            email,
            password,
        });

        if (authError) {
            throw new BadRequestException(authError.message);
        }

        if (!authData.user) {
            throw new BadRequestException('Failed to create user');
        }

        // Create user profile in database
        const user = await this.userService.create({
            id: authData.user.id,
            email,
            username,
            fullName,
        });

        // Generate JWT tokens
        const tokens = await this.generateTokens({
            sub: user.id,
            email: user.email,
            username: user.username,
        });

        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                fullName: user.fullName,
            },
        };
    }

    async login(loginDto: LoginDto): Promise<{ accessToken: string; refreshToken: string; user: { id: string; email: string; username: string; fullName: string } }> {
        const { email, password } = loginDto;

        // Sign in with Supabase Auth
        const { data: authData, error: authError } = await this.supabaseService.auth.signInWithPassword({
            email,
            password,
        });

        if (authError || !authData.user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Get user profile
        const user = await this.userService.findById(authData.user.id);
        
        if (!user) {
            throw new UnauthorizedException('User profile not found');
        }

        // Generate JWT tokens
        const tokens = await this.generateTokens({
            sub: user.id,
            email: user.email,
            username: user.username,
        });

        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                fullName: user.fullName,
            },
        };
    }

    async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
        const { data, error } = await this.supabaseService.auth.refreshSession({
            refresh_token: refreshToken,
        });

        if (error || !data.user) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const user = await this.userService.findById(data.user.id);
        
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            username: user.username,
        };

        return {
            accessToken: this.jwtService.sign(payload),
        };
    }

    async logout(): Promise<void> {
        await this.supabaseService.auth.signOut();
    }

    validateUser(userId: string) {
        return this.userService.findById(userId);
    }

    private generateTokens(payload: JwtPayload): { accessToken: string; refreshToken: string } {
        return {
            accessToken: this.jwtService.sign(payload),
            refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
        };
    }
}

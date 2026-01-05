import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

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

        this.logger.log(`User registered: ${user.username} (${user.email})`);

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

        this.logger.log(`User logged in: ${user.username} (${user.email})`);

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
        // 1. Validate the refresh token JWT
        let payload: JwtPayload;
        try {
            payload = this.jwtService.verify<JwtPayload>(refreshToken);
        } catch (error) {
            this.logger.warn('Invalid refresh token attempted');
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        // 2. Check that the user still exists in the database
        const user = await this.userService.findById(payload.sub);
        
        if (!user) {
            this.logger.warn(`Refresh token used for non-existent user: ${payload.sub}`);
            throw new UnauthorizedException('User not found');
        }

        // 3. Generate new access token
        const newPayload: JwtPayload = {
            sub: user.id,
            email: user.email,
            username: user.username,
        };

        this.logger.debug(`Token refreshed for user: ${user.username}`);

        return {
            accessToken: this.jwtService.sign(newPayload),
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

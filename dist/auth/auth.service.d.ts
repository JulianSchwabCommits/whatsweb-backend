import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private supabaseService;
    private userService;
    private jwtService;
    private readonly logger;
    constructor(supabaseService: SupabaseService, userService: UserService, jwtService: JwtService);
    register(registerDto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            username: string;
            fullName: string;
        };
    }>;
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            username: string;
            fullName: string;
        };
    }>;
    refreshToken(refreshToken: string): Promise<{
        accessToken: string;
    }>;
    logout(): Promise<void>;
    validateUser(userId: string): Promise<import("../user/interfaces/user.interface").User | null>;
    private generateTokens;
}

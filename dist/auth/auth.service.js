"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const supabase_service_1 = require("../supabase/supabase.service");
const user_service_1 = require("../user/user.service");
let AuthService = AuthService_1 = class AuthService {
    supabaseService;
    userService;
    jwtService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(supabaseService, userService, jwtService) {
        this.supabaseService = supabaseService;
        this.userService = userService;
        this.jwtService = jwtService;
    }
    async register(registerDto) {
        const { email, password, username, fullName } = registerDto;
        const existingUser = await this.userService.findByUsername(username);
        if (existingUser) {
            throw new common_1.ConflictException('Username already taken');
        }
        const { data: authData, error: authError } = await this.supabaseService.auth.signUp({
            email,
            password,
        });
        if (authError) {
            throw new common_1.BadRequestException(authError.message);
        }
        if (!authData.user) {
            throw new common_1.BadRequestException('Failed to create user');
        }
        const user = await this.userService.create({
            id: authData.user.id,
            email,
            username,
            fullName,
        });
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
    async login(loginDto) {
        const { email, password } = loginDto;
        const { data: authData, error: authError } = await this.supabaseService.auth.signInWithPassword({
            email,
            password,
        });
        if (authError || !authData.user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const user = await this.userService.findById(authData.user.id);
        if (!user) {
            throw new common_1.UnauthorizedException('User profile not found');
        }
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
    async refreshToken(refreshToken) {
        let payload;
        try {
            payload = this.jwtService.verify(refreshToken);
        }
        catch (error) {
            this.logger.warn('Invalid refresh token attempted');
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        const user = await this.userService.findById(payload.sub);
        if (!user) {
            this.logger.warn(`Refresh token used for non-existent user: ${payload.sub}`);
            throw new common_1.UnauthorizedException('User not found');
        }
        const newPayload = {
            sub: user.id,
            email: user.email,
            username: user.username,
        };
        this.logger.debug(`Token refreshed for user: ${user.username}`);
        return {
            accessToken: this.jwtService.sign(newPayload),
        };
    }
    async logout() {
        await this.supabaseService.auth.signOut();
    }
    validateUser(userId) {
        return this.userService.findById(userId);
    }
    generateTokens(payload) {
        return {
            accessToken: this.jwtService.sign(payload),
            refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        user_service_1.UserService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map
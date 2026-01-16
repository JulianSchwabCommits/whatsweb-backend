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
    private readonly supabase: SupabaseService,
    private readonly users: UserService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const { email, password, username, fullName } = dto;

    if (await this.users.findByUsername(username)) {
      throw new ConflictException('Username already taken');
    }

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    });

    if (error || !data.user) {
      throw new BadRequestException(error?.message ?? 'Signup failed');
    }

    const user = await this.users.create({
      id: data.user.id,
      email,
      username,
      fullName,
    });

    const tokens = this.generateTokens(user);

    this.logger.log(`User registered: ${user.username}`);

    return {
      ...tokens,
      user: this.toPublicUser(user),
    };
  }

  async login(dto: LoginDto) {
    const { email, password } = dto;

    const { data, error } =
      await this.supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.users.findById(data.user.id);
    if (!user) {
      throw new UnauthorizedException('User profile not found');
    }

    const tokens = this.generateTokens(user);

    this.logger.log(`User logged in: ${user.username}`);

    return {
      ...tokens,
      user: this.toPublicUser(user),
    };
  }

  async refreshToken(refreshToken: string) {
    let payload: JwtPayload;

    try {
      payload = this.jwt.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      accessToken: this.jwt.sign(this.toJwtPayload(user)),
    };
  }

  async logout() {
    await this.supabase.auth.signOut();
  }

  validateUser(userId: string) {
    return this.users.findById(userId);
  }

  private generateTokens(user: any) {
    const payload = this.toJwtPayload(user);

    return {
      accessToken: this.jwt.sign(payload),
      refreshToken: this.jwt.sign(payload, { expiresIn: '7d' }),
    };
  }

  private toJwtPayload(user: any): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      username: user.username,
    };
  }

  private toPublicUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
    };
  }
}

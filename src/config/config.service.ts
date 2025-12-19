import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
    constructor(private configService: NestConfigService) { }

    get port(): number {
        return this.configService.get<number>('PORT') ?? 8080;
    }

    get allowedOrigins(): string[] {
        const origins = this.configService.get<string>('ALLOWED_ORIGINS');
        const defaultOrigins = ['http://localhost:3000'];

        if (!origins) {
            return defaultOrigins;
        }

        // Parse comma-separated origins and include localhost for dev
        const parsedOrigins = origins.split(',').map((o) => o.trim());
        return [...new Set([...parsedOrigins, ...defaultOrigins])];
    }

    get websiteHostname(): string | undefined {
        return this.configService.get<string>('WEBSITE_HOSTNAME');
    }

    get isProduction(): boolean {
        return !!this.websiteHostname;
    }

    get serverUrl(): string {
        const protocol = this.isProduction ? 'https' : 'http';
        const host = this.websiteHostname ?? `localhost:${this.port}`;
        return `${protocol}://${host}`;
    }

    get supabaseUrl(): string {
        const url = this.configService.get<string>('SUPABASE_URL');
        if (!url) {
            throw new Error('SUPABASE_URL environment variable must be configured');
        }
        return url;
    }

    get supabaseAnonKey(): string {
        const key = this.configService.get<string>('SUPABASE_ANON_KEY');
        if (!key) {
            throw new Error('SUPABASE_ANON_KEY environment variable must be configured');
        }
        return key;
    }

    get jwtSecret(): string {
        const secret = this.configService.get<string>('JWT_SECRET');
        if (!secret) {
            throw new Error('JWT_SECRET environment variable must be configured');
        }
        return secret;
    }

    get jwtExpiration(): string {
        const expiresIn = this.configService.get<string>('JWT_EXPIRATION');
        if (!expiresIn) {
            throw new Error('JWT_EXPIRATION environment variable must be configured');
        }
        return expiresIn;
    }
}

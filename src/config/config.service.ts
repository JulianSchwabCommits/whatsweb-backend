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
        return this.configService.get<string>('SUPABASE_URL') ?? '';
    }

    get supabaseAnonKey(): string {
        return this.configService.get<string>('SUPABASE_ANON_KEY') ?? '';
    }

    get jwtSecret(): string {
        return this.configService.get<string>('JWT_SECRET') ?? '';
    }

    get jwtExpiration(): string {
        return this.configService.get<string>('JWT_EXPIRATION') ?? '1h';
    }
}

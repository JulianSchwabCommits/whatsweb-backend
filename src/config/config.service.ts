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
        if (!origins) return ['http://localhost:3000'];
        return [...new Set([...origins.split(',').map(o => o.trim()), 'http://localhost:3000'])];
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
}

import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(
    private readonly config: NestConfigService,
  ) {}

  get port(): number {
    return this.config.get<number>('PORT') ?? 8080;
  }

  get websiteHostname(): string | undefined {
    return this.config.get<string>('WEBSITE_HOSTNAME');
  }

  get isProduction(): boolean {
    return Boolean(this.websiteHostname);
  }

  get allowedOrigins(): string[] {
    const raw = this.config.get<string>('ALLOWED_ORIGINS');
    const origins = raw
      ? raw.split(',').map(o => o.trim())
      : [];

    origins.push('http://localhost:3000');

    return Array.from(new Set(origins));
  }

  get serverUrl(): string {
    const protocol = this.isProduction ? 'https' : 'http';
    const host = this.websiteHostname ?? `localhost:${this.port}`;
    return `${protocol}://${host}`;
  }
}

import { ConfigService as NestConfigService } from '@nestjs/config';
export declare class ConfigService {
    private configService;
    constructor(configService: NestConfigService);
    get port(): number;
    get allowedOrigins(): string[];
    get websiteHostname(): string | undefined;
    get isProduction(): boolean;
    get serverUrl(): string;
}

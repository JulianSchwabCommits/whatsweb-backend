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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let ConfigService = class ConfigService {
    configService;
    constructor(configService) {
        this.configService = configService;
    }
    get port() {
        return this.configService.get('PORT') ?? 8080;
    }
    get allowedOrigins() {
        const origins = this.configService.get('ALLOWED_ORIGINS');
        if (!origins)
            return ['http://localhost:3000'];
        return [...new Set([...origins.split(',').map(o => o.trim()), 'http://localhost:3000'])];
    }
    get websiteHostname() {
        return this.configService.get('WEBSITE_HOSTNAME');
    }
    get isProduction() {
        return !!this.websiteHostname;
    }
    get serverUrl() {
        const protocol = this.isProduction ? 'https' : 'http';
        const host = this.websiteHostname ?? `localhost:${this.port}`;
        return `${protocol}://${host}`;
    }
};
exports.ConfigService = ConfigService;
exports.ConfigService = ConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ConfigService);
//# sourceMappingURL=config.service.js.map
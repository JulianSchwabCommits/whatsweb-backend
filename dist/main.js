"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const config_service_1 = require("./config/config.service");
const common_1 = require("@nestjs/common");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const config = app.get(config_service_1.ConfigService);
    app.use((0, cookie_parser_1.default)());
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.enableCors({ origin: config.allowedOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], credentials: true });
    app.enableShutdownHooks();
    await app.listen(config.port);
    new common_1.Logger('Bootstrap').log(`Server running on ${config.serverUrl}`);
}
bootstrap();
//# sourceMappingURL=main.js.map
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Enable CORS for REST endpoints
  app.enableCors({
    origin: configService.allowedOrigins,
    methods: ['GET', 'POST'],
  });

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  const port = configService.port;
  await app.listen(port);

  logger.log(`Server running on ${configService.serverUrl}`);
}

bootstrap();

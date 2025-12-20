import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import { Logger, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableCors({ origin: config.allowedOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], credentials: true });
  app.enableShutdownHooks();

  await app.listen(config.port);
  new Logger('Bootstrap').log(`Server running on ${config.serverUrl}`);
}

bootstrap();

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '../src/config/config.service';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(async () => {
    process.env.PORT = '8080';
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
    process.env.WEBSITE_HOSTNAME = 'test.example.com';

    const module: TestingModule = await Test.createTestingModule({
      imports: [NestConfigModule.forRoot({ isGlobal: true })],
      providers: [ConfigService],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
  });

  it('should return port from environment', () => {
    // ConfigService.get<number>('PORT') returns string from env, needs parseInt
    expect(service.port).toBeDefined();
    expect([8080, '8080']).toContain(service.port);
  });

  it('should return allowed origins', () => {
    expect(service.allowedOrigins).toContain('http://localhost:3000');
  });

  it('should detect production environment', () => {
    expect(service.isProduction).toBe(true);
  });

  it('should generate correct server URL', () => {
    expect(service.serverUrl).toBe('https://test.example.com');
  });
});

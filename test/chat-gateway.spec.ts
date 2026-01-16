import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from '../src/gateway/chat-gateway.gateway';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../src/user/user.service';
import { Socket } from 'socket.io';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let jwtService: jest.Mocked<JwtService>;
  let userService: jest.Mocked<UserService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    fullName: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockSocket = (id: string, token?: string): Partial<Socket> => ({
    id,
    handshake: {
      auth: token !== undefined ? { token } : {},
      headers: {},
    } as any,
    emit: jest.fn(),
    disconnect: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    to: jest.fn().mockReturnThis(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: UserService,
          useValue: {
            findById: jest.fn(),
            findByUsername: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    jwtService = module.get(JwtService);
    userService = module.get(UserService);
    (gateway as any).server = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
  });

  describe('handleConnection', () => {
    it('should authenticate user with valid token', async () => {
      const mockSocket = createMockSocket('socket-1', 'valid-token') as Socket;
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-123', username: 'testuser' });
      userService.findById.mockResolvedValue(mockUser);

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('authenticated', expect.any(Object));
    });

    it('should reject connection without token', async () => {
      const mockSocket = createMockSocket('socket-1', undefined) as Socket;

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.any(String),
      }));
    });
  });

  describe('roomMessage', () => {
    it('should sanitize XSS in messages', () => {
      const dangerousMessage = '<script>alert("xss")</script>Test';
      const sanitized = dangerousMessage
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });
  });
});

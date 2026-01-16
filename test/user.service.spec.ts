import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../src/user/user.service';
import { SupabaseService } from '../src/supabase/supabase.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('UserService', () => {
  let service: UserService;
  let mockSupabaseClient: any;

  const mockDbUser = {
    id: '123',
    email: 'test@example.com',
    username: 'testuser',
    full_name: 'Test User',
    password: 'hashedpassword',
    created_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: SupabaseService,
          useValue: {
            getClient: () => mockSupabaseClient,
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('create', () => {
    it('should create user successfully', async () => {
      mockSupabaseClient.single.mockResolvedValue({ data: mockDbUser, error: null });

      const result = await service.create({
        email: 'test@example.com',
        password: 'hashedpassword',
        username: 'testuser',
        fullName: 'Test User',
      });

      expect(result.email).toBe('test@example.com');
      expect(result.username).toBe('testuser');
    });

    it('should throw ConflictException on duplicate username', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'Duplicate username' },
      });

      await expect(service.create({
        email: 'test@example.com',
        password: 'hashedpassword',
        username: 'testuser',
        fullName: 'Test User',
      })).rejects.toThrow(ConflictException);
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockDbUser, error: null })
          })
        })
      });

      const result = await service.findByEmail('test@example.com');

      expect(result?.email).toBe('test@example.com');
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updatedUser = { ...mockDbUser, username: 'newusername' };
      mockSupabaseClient.single.mockResolvedValue({ data: updatedUser, error: null });

      const result = await service.updateUser('123', { username: 'newusername' });

      expect(result.username).toBe('newusername');
    });
  });
});

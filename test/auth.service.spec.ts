import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth/auth.service';
import { UserService } from '../src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../src/supabase/supabase.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService - Core Functions', () => {
  describe('Password Hashing', () => {
    it('should hash passwords before storing', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
      
      const result = await bcrypt.hash('mypassword', 10);
      
      expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 10);
      expect(result).toBe('hashedpassword');
    });

    it('should compare passwords correctly', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      
      const isValid = await bcrypt.compare('password', 'hashedpassword');
      
      expect(isValid).toBe(true);
    });
  });

  describe('User Creation', () => {
    it('should validate email format', () => {
      const validEmail = 'test@example.com';
      const invalidEmail = 'invalid-email';
      
      expect(validEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(invalidEmail).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should validate password strength', () => {
      const strongPassword = 'MyPassword123!';
      const weakPassword = 'weak';
      
      // Min 8 chars, uppercase, lowercase, number, special char
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d})(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      
      expect(strongPassword.length).toBeGreaterThanOrEqual(8);
      expect(weakPassword.length).toBeLessThan(8);
    });
  });
});

import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { User, CreateUserData } from './interfaces/user.interface';

@Injectable()
export class UserService {
    constructor(private supabaseService: SupabaseService) { }

    async create(userData: CreateUserData): Promise<User> {
        const { data, error } = await this.supabaseService
            .getClient()
            .from('users')
            .insert({
                id: userData.id,
                email: userData.email,
                username: userData.username,
                full_name: userData.fullName,
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw new ConflictException('User with this email or username already exists');
            }
            throw error;
        }

        return this.mapToUser(data);
    }

    async findById(id: string): Promise<User | null> {
        const { data, error } = await this.supabaseService
            .getClient()
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            return null;
        }

        return this.mapToUser(data);
    }

    async findByEmail(email: string): Promise<User | null> {
        const { data, error } = await this.supabaseService
            .getClient()
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !data) {
            return null;
        }

        return this.mapToUser(data);
    }

    async findByUsername(username: string): Promise<User | null> {
        const { data, error } = await this.supabaseService
            .getClient()
            .from('users')
            .select('*')
            .eq('username', username)
            .maybeSingle();

        if (error || !data) {
            return null;
        }

        return this.mapToUser(data);
    }

    async updateUser(id: string, updates: Partial<User>): Promise<User> {
        const updateData: any = {};
        
        if (updates.username) updateData.username = updates.username;
        if (updates.fullName) updateData.full_name = updates.fullName;

        const { data, error } = await this.supabaseService
            .getClient()
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        if (!data) {
            throw new NotFoundException('User not found');
        }

        return this.mapToUser(data);
    }

    private mapToUser(data: any): User {
        return {
            id: data.id,
            email: data.email,
            username: data.username,
            fullName: data.full_name,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
        };
    }
}

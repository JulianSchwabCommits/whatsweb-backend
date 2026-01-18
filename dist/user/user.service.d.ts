import { SupabaseService } from '../supabase/supabase.service';
import { User, CreateUserData } from './interfaces/user.interface';
export declare class UserService {
    private supabaseService;
    constructor(supabaseService: SupabaseService);
    create(userData: CreateUserData): Promise<User>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findByUsername(username: string): Promise<User | null>;
    updateUser(id: string, updates: Partial<User>): Promise<User>;
    private mapToUser;
}

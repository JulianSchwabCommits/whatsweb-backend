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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let UserService = class UserService {
    supabaseService;
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    async create(userData) {
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
            if (error.code === '23505') {
                throw new common_1.ConflictException('User with this email or username already exists');
            }
            throw error;
        }
        return this.mapToUser(data);
    }
    async findById(id) {
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
    async findByEmail(email) {
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
    async findByUsername(username) {
        const { data, error } = await this.supabaseService
            .getClient()
            .from('users')
            .select('*')
            .eq('username', username)
            .single();
        if (error || !data) {
            return null;
        }
        return this.mapToUser(data);
    }
    async updateUser(id, updates) {
        const updateData = {};
        if (updates.username)
            updateData.username = updates.username;
        if (updates.fullName)
            updateData.full_name = updates.fullName;
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
            throw new common_1.NotFoundException('User not found');
        }
        return this.mapToUser(data);
    }
    mapToUser(data) {
        return {
            id: data.id,
            email: data.email,
            username: data.username,
            fullName: data.full_name,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
        };
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], UserService);
//# sourceMappingURL=user.service.js.map
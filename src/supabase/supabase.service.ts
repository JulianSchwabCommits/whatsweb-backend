import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
    private supabase: SupabaseClient;

    constructor(private configService: NestConfigService) {
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
        // Use service role key for backend operations (bypasses RLS)
        const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY') 
            || this.configService.get<string>('SUPABASE_ANON_KEY');

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase URL and SERVICE_KEY (or ANON_KEY) must be provided in environment variables');
        }

        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    getClient(): SupabaseClient {
        return this.supabase;
    }

    get auth() {
        return this.supabase.auth;
    }

    get db() {
        return this.supabase;
    }
}

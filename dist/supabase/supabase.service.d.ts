import { ConfigService as NestConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
export declare class SupabaseService {
    private configService;
    private supabase;
    constructor(configService: NestConfigService);
    getClient(): SupabaseClient;
    get auth(): import("@supabase/supabase-js/dist/module/lib/SupabaseAuthClient.js").SupabaseAuthClient;
    get db(): SupabaseClient<any, "public", "public", any, any>;
}

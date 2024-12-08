// utils/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Fetching Supabase URL and ANON Key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Creating the Supabase client instance
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;

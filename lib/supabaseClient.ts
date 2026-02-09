import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase env vars. Check .env.local and Vercel env settings.");
}

// After the guard above, we can safely assert they're strings
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

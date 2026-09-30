import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variabel Supabase tidak ditemukan! Pastikan .env.local sudah dibuat di root folder dan server Next.js sudah di-restart.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
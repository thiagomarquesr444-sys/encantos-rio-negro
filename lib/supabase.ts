import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

if (!supabaseUrl) {
  throw new Error(
    'Configuração da ERN incompleta: defina NEXT_PUBLIC_SUPABASE_URL.',
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Configuração da ERN incompleta: defina NEXT_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey,
);
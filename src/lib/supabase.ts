/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export const getSupabaseClient = (url?: string, anonKey?: string): SupabaseClient | null => {
  const finalUrl = url || import.meta.env.VITE_TASKFLOW_SUPABASE_URL;
  const finalKey = anonKey || import.meta.env.VITE_TASKFLOW_SUPABASE_ANON_KEY;

  if (!finalUrl || !finalKey) return null;

  if (cachedClient && cachedUrl === finalUrl && cachedKey === finalKey) {
    return cachedClient;
  }

  cachedUrl = finalUrl;
  cachedKey = finalKey;
  cachedClient = createClient(finalUrl, finalKey);
  return cachedClient;
};

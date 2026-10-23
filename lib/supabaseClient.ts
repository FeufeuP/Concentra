'use client';

import { createClient } from '@supabase/supabase-js';
import { getSupabaseCredentials, getSupabaseClient } from './supabase';

const creds = getSupabaseCredentials();
export const supabase = creds.url && creds.anonKey ? createClient(creds.url, creds.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
}) : null;

export { getSupabaseClient, getSupabaseCredentials };
export default supabase;

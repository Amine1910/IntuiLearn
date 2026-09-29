import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isConfigured = Boolean(url && key && !url.includes('your-fresh-project'));
// No requests are made until configuration has passed the application's setup gate.
export const supabase = createClient(isConfigured ? url : 'https://setup-required.supabase.co', isConfigured ? key : 'setup-required');

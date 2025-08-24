import { createClient } from '@supabase/supabase-js';

// These variables are pulled from your .env.local file.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase URL or Key in environment variables.');
}

// Create a single, reusable Supabase client instance.
// This is a generic client. For client components in the App Router,
// it's recommended to use `createClientComponentClient` from `@supabase/auth-helpers-nextjs`.
export const supabase = createClient(supabaseUrl, supabaseKey);
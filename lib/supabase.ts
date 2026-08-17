/**
 * CR AudioViz AI - Supabase Client
 * =================================
 * 
 * Universal database client for CR AudioViz AI apps.
 * For authentication, credits, and central services, use:
 * 
 *   import { CentralServices, CentralAuth, CentralCredits } from './central-services';
 * 
 * This client is for app-specific database operations only.
 * Auth, payments, and credits should ALWAYS go through central services.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Re-export admin utilities from central services
export { isAdmin, shouldChargeCredits, ADMIN_EMAILS, CentralServices } from './central-services';

// Centralized Supabase configuration.
//
// These are read with literal member access, not process.env[name], because
// Next only inlines NEXT_PUBLIC_* variables it can see written out in full.
// A dynamic lookup silently yields undefined in the browser bundle.
//
// Missing configuration throws here, at import, with a message that names the
// variable. createClient already threw in that case; it just threw something
// unhelpful.
function requireSupabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set. Supabase cannot be initialised.');
  }
  return value;
}

function requireSupabaseAnonKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Supabase cannot be initialised.');
  }
  return value;
}

const SUPABASE_URL: string = requireSupabaseUrl();
const SUPABASE_ANON_KEY: string = requireSupabaseAnonKey();

// Standard client for general use
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Browser client for auth (SSR-safe singleton pattern)
let browserClient: SupabaseClient | null = null;

export function createSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    // Server-side: return new client each time
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  
  // Client-side: return singleton
  if (!browserClient) {
    browserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return browserClient;
}

// Server client for API routes
export function createSupabaseServerClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set, using anon key');
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return createClient(SUPABASE_URL, serviceKey);
}

export { SUPABASE_URL, SUPABASE_ANON_KEY };
export default supabase;

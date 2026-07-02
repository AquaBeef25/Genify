
import { createBrowserClient } from '@supabase/ssr'

// We wrap this in a function so we can generate a fresh client securely 
// whenever a React component needs to talk to the database.
export function createClient() {
  return createBrowserClient(
    // The exclamation marks (!) tell TypeScript to stop yelling 
    // because we guarantee these environment variables exist.
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL || 'https://jzfsghfvwaagyqyensba.supabase.co';
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6ZnNnaGZ2d2FhZ3lxeWVuc2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NjA1MDQsImV4cCI6MjA3NjIzNjUwNH0.q6RoXHOnW6TTj6i0SmyL7YpT8MQNkdiX0BQbsWbtx4s';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

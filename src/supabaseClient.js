import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://poigdqqoabwyllerunjq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvaWdkcXFvYWJ3eWxsZXJ1bmpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NjcxODAsImV4cCI6MjA3NDQ0MzE4MH0.FeolsVDz0HLLtp9jMgBLf_nB0jgPEXen7U8K7vG6BBg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

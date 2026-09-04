import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dpyputseylxmvitagkgh.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRweXB1dHNleWx4bXZpdGFna2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTk1MjMsImV4cCI6MjEwNDAzNTUyM30.U046SvKPopg0GC-SUo7AgIhHJfSIz6DkMNk2iUAW29c'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

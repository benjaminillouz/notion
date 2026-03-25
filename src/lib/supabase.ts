import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jcppaboawmgizafhused.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjcHBhYm9hd21naXphZmh1c2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjEyODcsImV4cCI6MjA4Njg5NzI4N30.Lr_8C8xQc99pBT-NNsvBaiY_tzXQK1mkPJ9G6BAABg0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

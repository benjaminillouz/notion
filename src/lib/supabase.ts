import { createClient } from '@supabase/supabase-js';

// Public anon key — safe to expose client-side, protected by RLS
const supabaseUrl = 'https://jcppaboawmgizafhused.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjcHBhYm9hd21naXphZmh1c2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjEyODcsImV4cCI6MjA4Njg5NzI4N30.Lr_8C8xQc99pBT-NNsvBaiY_tzXQK1mkPJ9G6BAABg0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

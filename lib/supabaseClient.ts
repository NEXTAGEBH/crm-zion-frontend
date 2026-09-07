import { createClient } from "@supabase/supabase-js";

// Essas são as chaves do seu projeto que usamos antes
const supabaseUrl = 'https://hbqgwyrnpqkoyufznbta.supabase.co';
const supabaseAnonKey = 'sb_publishable_DUQyEAGUow_ytseKpPUmHQ_L2qETeoh';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
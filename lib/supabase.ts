import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types matching the database schema
export type Booking = {
  id: string;
  trainer_id: string;
  client_id: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  title: string | null;
  notes: string | null;
  token: string;
  created_at: string;
  confirmed_at: string | null;
};

export type BookingSlot = {
  id: string;
  booking_id: string;
  proposed_time: string;
  is_selected: boolean;
  created_at: string;
};

export type Client = {
  id: string;
  trainer_id: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
};

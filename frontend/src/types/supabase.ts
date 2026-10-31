/**
 * @file supabase.ts
 * @description Supabase client singleton and database type helpers.
 *
 * Member 3 will extend `Database` with the full generated types from
 * `supabase gen types typescript --project-id <id>`.
 */

import { createClient } from '@supabase/supabase-js'

// ─── Database type scaffold (Member 3 will expand this) ──────────────────────

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          role: 'patient' | 'caregiver' | 'doctor'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      patients: {
        Row: {
          id: string
          user_id: string
          full_name: string
          date_of_birth: string
          blood_type: string
          height_cm: number
          weight_kg: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['patients']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['patients']['Insert']>
      }
      vitals: {
        Row: {
          id: string
          patient_id: string
          recorded_at: string
          heart_rate: number
          systolic_bp: number
          diastolic_bp: number
          respiratory_rate: number
          oxygen_saturation: number
          temperature: number
          blood_glucose: number | null
        }
        Insert: Omit<Database['public']['Tables']['vitals']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['vitals']['Insert']>
      }
      medications: {
        Row: {
          id: string
          patient_id: string
          prescribed_by_id: string
          name: string
          dosage: string
          frequency: string
          status: 'active' | 'discontinued' | 'on_hold'
          start_date: string
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['medications']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['medications']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}

// ─── Supabase Client Singleton ───────────────────────────────────────────────

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
    'Add them to frontend/.env.local'
  )
}

export const supabase = createClient<Database>(
  supabaseUrl  ?? 'https://placeholder.supabase.co',
  supabaseKey  ?? 'placeholder-anon-key'
)

export type SupabaseClient = typeof supabase

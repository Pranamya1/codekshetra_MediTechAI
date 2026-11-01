-- ============================================================
-- MediCare AI — Medication Tracking Migration
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mmumxtpvlwrswyjcpgxb/sql
-- ============================================================

-- 1. Add timing/meal columns to medications table
ALTER TABLE medications
  ADD COLUMN IF NOT EXISTS timings         TEXT[]  DEFAULT ARRAY['morning'],
  ADD COLUMN IF NOT EXISTS meal_instruction TEXT   DEFAULT 'any_time',
  ADD COLUMN IF NOT EXISTS notes           TEXT,
  ADD COLUMN IF NOT EXISTS is_critical     BOOLEAN DEFAULT false;

-- 2. Create medication_logs table (daily check-ins)
CREATE TABLE IF NOT EXISTS medication_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID        NOT NULL REFERENCES patients(id)    ON DELETE CASCADE,
  medication_id   UUID        NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  medication_name TEXT        NOT NULL,
  dosage          TEXT,
  timing_slot     TEXT        NOT NULL,  -- 'morning' | 'afternoon' | 'evening' | 'night'
  scheduled_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
  taken_at        TIMESTAMPTZ,           -- NULL = not yet taken
  status          TEXT        NOT NULL DEFAULT 'pending', -- 'pending' | 'taken' | 'missed'
  is_critical     BOOLEAN     DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (patient_id, medication_id, timing_slot, scheduled_date)
);

-- 3. Enable Row Level Security on medication_logs
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for medication_logs

-- Patients: view only their own logs
CREATE POLICY "patients_select_own_med_logs"
  ON medication_logs FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- Patients: insert their own logs
CREATE POLICY "patients_insert_own_med_logs"
  ON medication_logs FOR INSERT
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- Patients: update their own logs (mark as taken/missed)
CREATE POLICY "patients_update_own_med_logs"
  ON medication_logs FOR UPDATE
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- 5. Also allow patients to view their own medications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'medications' AND policyname = 'patients_select_own_medications'
  ) THEN
    CREATE POLICY "patients_select_own_medications"
      ON medications FOR SELECT
      USING (
        patient_id IN (
          SELECT id FROM patients WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 6. Add gender column to patients if not exists
ALTER TABLE patients ADD COLUMN IF NOT EXISTS gender TEXT;

-- ============================================================
-- Verify: check tables exist
-- ============================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('patients', 'medications', 'medication_logs', 'vitals', 'appointments');

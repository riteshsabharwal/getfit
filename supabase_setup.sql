-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This creates all three tables needed for the GetFit app

-- 1. Weight logs (main daily log)
CREATE TABLE IF NOT EXISTS weight_logs (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  weight NUMERIC(5,2) NOT NULL,
  body_fat NUMERIC(5,2),
  waist_cm NUMERIC(5,1),
  energy SMALLINT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Protein logs
CREATE TABLE IF NOT EXISTS protein_logs (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_grams INTEGER NOT NULL DEFAULT 0,
  items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Workout logs
CREATE TABLE IF NOT EXISTS workout_logs (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  activity TEXT NOT NULL,
  duration_mins INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) but allow all access (personal app, no user auth)
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE protein_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations from anon key (password is handled in the app itself)
CREATE POLICY "Allow all" ON weight_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON protein_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON workout_logs FOR ALL USING (true) WITH CHECK (true);

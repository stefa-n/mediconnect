-- SQL script to create sample data for testing the patient dashboard
-- Run this in your Supabase SQL Editor

-- First, ensure you have the necessary tables created
-- This script assumes tables exist, it just adds sample data

-- Example: Insert a sample appointment (replace UUIDs with your actual user IDs)
/*
INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, specialty, notes)
VALUES 
  ('your-patient-uuid', 'your-doctor-uuid', '2025-10-25', '10:00 AM', 'confirmed', 'Cardiology', 'Regular checkup'),
  ('your-patient-uuid', 'your-doctor-uuid', '2025-10-28', '2:30 PM', 'pending', 'General Practice', 'Follow-up consultation'),
  ('your-patient-uuid', 'your-doctor-uuid', '2025-11-02', '11:15 AM', 'confirmed', 'Dermatology', 'Skin examination');

-- Example: Insert sample prescriptions
INSERT INTO prescriptions (patient_id, doctor_id, medication_name, dosage, frequency, duration, status, prescribed_date, notes)
VALUES 
  ('your-patient-uuid', 'your-doctor-uuid', 'Amoxicillin 500mg', '500mg', '3 times daily', '7 days', 'active', '2025-10-15', 'Take with food'),
  ('your-patient-uuid', 'your-doctor-uuid', 'Lisinopril 10mg', '10mg', 'Once daily', '30 days', 'active', '2025-10-10', 'For blood pressure');

-- Example: Insert sample medical records
INSERT INTO medical_records (patient_id, doctor_id, record_type, title, description, record_date)
VALUES 
  ('your-patient-uuid', 'your-doctor-uuid', 'Lab Result', 'Blood Test Results', 'All values within normal range', '2025-10-01'),
  ('your-patient-uuid', 'your-doctor-uuid', 'Diagnosis', 'Hypertension', 'Stage 1 hypertension diagnosed', '2025-09-15'),
  ('your-patient-uuid', 'your-doctor-uuid', 'Vaccination', 'Flu Shot', 'Annual influenza vaccination administered', '2025-09-01');
*/

-- Query to get your user IDs for testing:
-- SELECT id, full_name, email, role FROM profiles;

-- Helper function to create test data for a specific patient
-- Replace 'patient@example.com' with your test patient's email
DO $$
DECLARE
  patient_id UUID;
  doctor_id UUID;
BEGIN
  -- Get patient ID
  SELECT id INTO patient_id FROM profiles WHERE role = 'patient' LIMIT 1;
  
  -- Get doctor ID
  SELECT id INTO doctor_id FROM profiles WHERE role = 'doctor' LIMIT 1;
  
  IF patient_id IS NOT NULL AND doctor_id IS NOT NULL THEN
    -- Insert appointments
    INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, specialty, notes)
    VALUES 
      (patient_id, doctor_id, CURRENT_DATE + INTERVAL '3 days', '10:00 AM', 'confirmed', 'Cardiology', 'Regular checkup'),
      (patient_id, doctor_id, CURRENT_DATE + INTERVAL '6 days', '2:30 PM', 'pending', 'General Practice', 'Follow-up consultation'),
      (patient_id, doctor_id, CURRENT_DATE + INTERVAL '10 days', '11:15 AM', 'confirmed', 'Dermatology', 'Skin examination')
    ON CONFLICT DO NOTHING;

    -- Insert prescriptions
    INSERT INTO prescriptions (patient_id, doctor_id, medication_name, dosage, frequency, duration, status, prescribed_date, notes)
    VALUES 
      (patient_id, doctor_id, 'Amoxicillin 500mg', '500mg', '3 times daily', '7 days', 'active', CURRENT_DATE - INTERVAL '5 days', 'Take with food'),
      (patient_id, doctor_id, 'Lisinopril 10mg', '10mg', 'Once daily', '30 days', 'active', CURRENT_DATE - INTERVAL '10 days', 'For blood pressure')
    ON CONFLICT DO NOTHING;

    -- Insert medical records
    INSERT INTO medical_records (patient_id, doctor_id, record_type, title, description, record_date)
    VALUES 
      (patient_id, doctor_id, 'Lab Result', 'Blood Test Results', 'All values within normal range', CURRENT_DATE - INTERVAL '20 days'),
      (patient_id, doctor_id, 'Diagnosis', 'Hypertension', 'Stage 1 hypertension diagnosed', CURRENT_DATE - INTERVAL '35 days'),
      (patient_id, doctor_id, 'Vaccination', 'Flu Shot', 'Annual influenza vaccination administered', CURRENT_DATE - INTERVAL '50 days'),
      (patient_id, doctor_id, 'X-Ray', 'Chest X-Ray', 'No abnormalities detected', CURRENT_DATE - INTERVAL '60 days'),
      (patient_id, doctor_id, 'Visit', 'Annual Physical', 'Complete physical examination performed', CURRENT_DATE - INTERVAL '90 days')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Sample data created for patient % and doctor %', patient_id, doctor_id;
  ELSE
    RAISE NOTICE 'Please ensure you have at least one patient and one doctor in the profiles table';
  END IF;
END $$;

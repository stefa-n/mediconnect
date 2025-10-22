import { supabase } from './supabase';
import type { Appointment, Prescription, MedicalRecord, PatientProfile } from './types';

/**
 * Fetch patient profile by user ID
 * Note: profiles.id is linked to auth.users.id
 */
export async function getPatientProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as PatientProfile;
}

/**
 * Fetch upcoming appointments for a patient
 */
export async function getUpcomingAppointments(patientId: string, limit = 5) {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      doctor:profiles!appointments_doctor_id_fkey(id, full_name)
    `)
    .eq('patient_id', patientId)
    .gte('appointment_date', today)
    .order('appointment_date', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data as Appointment[];
}

/**
 * Fetch active prescriptions for a patient
 */
export async function getActivePrescriptions(patientId: string, limit = 5) {
  const { data, error } = await supabase
    .from('prescriptions')
    .select(`
      *,
      doctor:profiles!prescriptions_doctor_id_fkey(id, full_name)
    `)
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .order('prescribed_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as Prescription[];
}

/**
 * Get count of medical records for a patient
 */
export async function getMedicalRecordsCount(patientId: string) {
  const { count, error } = await supabase
    .from('medical_records')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', patientId);

  if (error) throw error;
  return count || 0;
}

/**
 * Fetch recent medical records for a patient
 */
export async function getRecentMedicalRecords(patientId: string, limit = 10) {
  const { data, error } = await supabase
    .from('medical_records')
    .select(`
      *,
      doctor:profiles!medical_records_doctor_id_fkey(id, full_name)
    `)
    .eq('patient_id', patientId)
    .order('record_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as MedicalRecord[];
}

/**
 * Create a new appointment
 */
export async function createAppointment(appointment: Partial<Appointment>) {
  const { data, error } = await supabase
    .from('appointments')
    .insert(appointment)
    .select()
    .single();

  if (error) throw error;
  return data as Appointment;
}

/**
 * Update appointment status
 */
export async function updateAppointmentStatus(
  appointmentId: string, 
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId)
    .select()
    .single();

  if (error) throw error;
  return data as Appointment;
}

/**
 * Get all doctors for appointment booking
 */
export async function getDoctors() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('role', 'doctor')
    .order('full_name');

  if (error) throw error;
  return data;
}

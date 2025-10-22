export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  specialty?: string;
  notes?: string;
  created_at: string;
  doctor?: {
    id: string;
    full_name: string;
    specialty?: string;
  };
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  status: 'active' | 'completed' | 'cancelled';
  prescribed_date: string;
  notes?: string;
  created_at: string;
  doctor?: {
    id: string;
    full_name: string;
  };
}

export interface MedicalRecord {
  id: string;
  patient_id: string;
  doctor_id: string;
  record_type: string;
  title: string;
  description?: string;
  record_date: string;
  created_at: string;
  doctor?: {
    id: string;
    full_name: string;
  };
}

export interface Activity {
  id: string;
  type: 'appointment' | 'prescription' | 'record' | 'other';
  title: string;
  description?: string;
  created_at: string;
}

export interface PatientProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'patient' | 'hospital_medic' | 'hospital_admin' | 'mediconnect_admin';
  hospital_id: string | null;
  cnp: string | null;
  created_at: string;
  updated_at: string;
}

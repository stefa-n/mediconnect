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
  role: 'patient' | 'hospital_medic' | 'hospital_admin' | 'mediconnect_admin' | 'pharmacy_admin' | 'pharmacist';
  hospital_id: string | null;
  pharmacy_id: string | null;
  cnp: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pharmacy {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionDispensation {
  id: string;
  prescription_id: string;
  pharmacy_id: string;
  pharmacist_id: string;
  dispensed_at: string;
  dose_number: number;
  notes?: string;
  created_at: string;
  pharmacist?: {
    id: string;
    full_name: string;
  };
  pharmacy?: {
    id: string;
    name: string;
  };
}

export interface ExtendedPrescription extends Prescription {
  total_doses: number;
  doses_dispensed: number;
  is_invalidated: boolean;
  invalidated_at?: string;
  invalidated_by?: string;
  invalidation_reason?: string;
  patient?: {
    id: string;
    full_name: string;
    cnp?: string;
  };
  dispensations?: PrescriptionDispensation[];
}

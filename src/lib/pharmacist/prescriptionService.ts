// Prescription Service for Pharmacists
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExtendedPrescription, PrescriptionDispensation } from '../types';

export interface PrescriptionSearchParams {
  patientCNP?: string;
  patientName?: string;
  medicationName?: string;
}

export class PrescriptionService {
  constructor(private supabase: SupabaseClient) {}

  async searchPrescriptions(params: PrescriptionSearchParams): Promise<ExtendedPrescription[]> {
    let query = this.supabase
      .from('prescriptions')
      .select(`
        *,
        patient:profiles!prescriptions_patient_id_fkey(id, full_name, cnp),
        medic:profiles!prescriptions_medic_id_fkey(id, full_name, department)
      `)
      .eq('status', 'active')
      .eq('is_invalidated', false);

    // Search by patient CNP
    if (params.patientCNP) {
      const { data: patient } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('cnp', params.patientCNP)
        .single();
      
      if (patient) {
        query = query.eq('patient_id', patient.id);
      } else {
        return []; // No patient found with that CNP
      }
    }

    // Search by patient name
    if (params.patientName) {
      const { data: patients } = await this.supabase
        .from('profiles')
        .select('id')
        .ilike('full_name', `%${params.patientName}%`);
      
      if (patients && patients.length > 0) {
        query = query.in('patient_id', patients.map(p => p.id));
      } else {
        return [];
      }
    }

    // Search by medication name
    if (params.medicationName) {
      query = query.ilike('medication_name', `%${params.medicationName}%`);
    }

    const { data, error } = await query.order('prescribed_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getPrescriptionById(id: string): Promise<ExtendedPrescription | null> {
    const { data, error } = await this.supabase
      .from('prescriptions')
      .select(`
        *,
        patient:profiles!prescriptions_patient_id_fkey(id, full_name, cnp),
        medic:profiles!prescriptions_medic_id_fkey(id, full_name, department),
        dispensations:prescription_dispensations(
          *,
          pharmacist:profiles(id, full_name),
          pharmacy:pharmacies(id, name)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async getPatientMedicalHistory(patientId: string) {
    const { data, error } = await this.supabase
      .from('medical_history')
      .select(`
        *,
        medic:profiles!medical_history_medic_id_fkey(id, full_name, department)
      `)
      .eq('patient_id', patientId)
      .order('visit_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getPatientPrescriptions(patientId: string) {
    const { data, error } = await this.supabase
      .from('prescriptions')
      .select(`
        *,
        medic:profiles!prescriptions_medic_id_fkey(id, full_name, department)
      `)
      .eq('patient_id', patientId)
      .order('prescribed_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async dispenseDose(
    prescriptionId: string,
    pharmacyId: string,
    pharmacistId: string,
    notes?: string
  ): Promise<PrescriptionDispensation> {
    // First, get the current prescription
    const { data: prescription, error: prescError } = await this.supabase
      .from('prescriptions')
      .select('doses_dispensed, total_doses, is_invalidated')
      .eq('id', prescriptionId)
      .single();

    if (prescError) throw prescError;

    if (prescription.is_invalidated) {
      throw new Error('This prescription has been invalidated and cannot be dispensed');
    }

    if (prescription.doses_dispensed >= prescription.total_doses) {
      throw new Error('All doses have already been dispensed');
    }

    const doseNumber = prescription.doses_dispensed + 1;

    // Create dispensation record
    const { data: dispensation, error: dispenseError } = await this.supabase
      .from('prescription_dispensations')
      .insert([{
        prescription_id: prescriptionId,
        pharmacy_id: pharmacyId,
        pharmacist_id: pharmacistId,
        dose_number: doseNumber,
        notes: notes
      }])
      .select(`
        *,
        pharmacist:profiles(id, full_name),
        pharmacy:pharmacies(id, name)
      `)
      .single();

    if (dispenseError) throw dispenseError;

    // Update prescription doses_dispensed count
    const newStatus = doseNumber >= prescription.total_doses ? 'completed' : 'active';
    
    const { error: updateError } = await this.supabase
      .from('prescriptions')
      .update({
        doses_dispensed: doseNumber,
        status: newStatus
      })
      .eq('id', prescriptionId);

    if (updateError) throw updateError;

    return dispensation;
  }

  async invalidatePrescription(
    prescriptionId: string,
    pharmacistId: string,
    reason: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('prescriptions')
      .update({
        is_invalidated: true,
        invalidated_at: new Date().toISOString(),
        invalidated_by: pharmacistId,
        invalidation_reason: reason,
        status: 'cancelled'
      })
      .eq('id', prescriptionId);

    if (error) throw error;
  }

  async getDispensationHistory(pharmacyId: string, limit: number = 50) {
    const { data, error } = await this.supabase
      .from('prescription_dispensations')
      .select(`
        *,
        prescription:prescriptions(
          id,
          medication_name,
          dosage,
          patient:profiles!prescriptions_patient_id_fkey(id, full_name, cnp)
        ),
        pharmacist:profiles(id, full_name),
        pharmacy:pharmacies(id, name)
      `)
      .eq('pharmacy_id', pharmacyId)
      .order('dispensed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
}

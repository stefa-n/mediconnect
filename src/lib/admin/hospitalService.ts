// Hospital Service - Business logic for hospital management
import type { SupabaseClient } from '@supabase/supabase-js';

export interface Hospital {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  created_at?: string;
}

export interface HospitalStats {
  admins: number;
  medics: number;
  patients: number;
}

export class HospitalService {
  constructor(private supabase: SupabaseClient) {}

  async getAll(): Promise<Hospital[]> {
    const { data, error } = await this.supabase
      .from('hospitals')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  async getById(id: string): Promise<Hospital | null> {
    const { data, error } = await this.supabase
      .from('hospitals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async create(hospital: Omit<Hospital, 'id' | 'created_at'>): Promise<Hospital> {
    const { data, error } = await this.supabase
      .from('hospitals')
      .insert([hospital])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, hospital: Partial<Hospital>): Promise<Hospital> {
    const { data, error } = await this.supabase
      .from('hospitals')
      .update(hospital)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('hospitals')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getStats(hospitalId: string): Promise<HospitalStats> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('role')
      .eq('hospital_id', hospitalId);

    if (error) throw error;

    const stats: HospitalStats = {
      admins: 0,
      medics: 0,
      patients: 0
    };

    data?.forEach(profile => {
      if (profile.role === 'hospital_admin') stats.admins++;
      else if (profile.role === 'medic') stats.medics++;
      else if (profile.role === 'patient') stats.patients++;
    });

    return stats;
  }

  async getAdmins(hospitalId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, email, full_name, role, department')
      .eq('hospital_id', hospitalId)
      .eq('role', 'hospital_admin');

    if (error) throw error;
    return data || [];
  }
}

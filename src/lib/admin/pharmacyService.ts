// Pharmacy Service - Business logic for pharmacy management
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Pharmacy } from '../types';

export interface PharmacyStats {
  admins: number;
  pharmacists: number;
  totalDispensations: number;
  dispensationsThisMonth: number;
}

export class PharmacyService {
  constructor(private supabase: SupabaseClient) {}

  async getAll(): Promise<Pharmacy[]> {
    const { data, error } = await this.supabase
      .from('pharmacies')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  async getById(id: string): Promise<Pharmacy | null> {
    const { data, error } = await this.supabase
      .from('pharmacies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async create(pharmacy: Omit<Pharmacy, 'id' | 'created_at' | 'updated_at'>): Promise<Pharmacy> {
    const { data, error } = await this.supabase
      .from('pharmacies')
      .insert([pharmacy])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, pharmacy: Partial<Pharmacy>): Promise<Pharmacy> {
    const { data, error } = await this.supabase
      .from('pharmacies')
      .update(pharmacy)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('pharmacies')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getStats(pharmacyId: string): Promise<PharmacyStats> {
    // Get staff counts
    const { data: profiles, error: profilesError } = await this.supabase
      .from('profiles')
      .select('role')
      .eq('pharmacy_id', pharmacyId);

    if (profilesError) throw profilesError;

    const stats: PharmacyStats = {
      admins: 0,
      pharmacists: 0,
      totalDispensations: 0,
      dispensationsThisMonth: 0
    };

    profiles?.forEach(profile => {
      if (profile.role === 'pharmacy_admin') stats.admins++;
      else if (profile.role === 'pharmacist') stats.pharmacists++;
    });

    // Get dispensation counts
    const { count: totalCount, error: totalError } = await this.supabase
      .from('prescription_dispensations')
      .select('*', { count: 'exact', head: true })
      .eq('pharmacy_id', pharmacyId);

    if (totalError) throw totalError;
    stats.totalDispensations = totalCount || 0;

    // Get this month's dispensations
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const { count: monthCount, error: monthError } = await this.supabase
      .from('prescription_dispensations')
      .select('*', { count: 'exact', head: true })
      .eq('pharmacy_id', pharmacyId)
      .gte('dispensed_at', firstDayOfMonth.toISOString());

    if (monthError) throw monthError;
    stats.dispensationsThisMonth = monthCount || 0;

    return stats;
  }

  async getAdmins(pharmacyId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .eq('role', 'pharmacy_admin')
      .order('full_name');

    if (error) throw error;
    return data || [];
  }

  async getPharmacists(pharmacyId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .eq('role', 'pharmacist')
      .order('full_name');

    if (error) throw error;
    return data || [];
  }

  async getStaff(pharmacyId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .in('role', ['pharmacy_admin', 'pharmacist'])
      .order('full_name');

    if (error) throw error;
    return data || [];
  }
}

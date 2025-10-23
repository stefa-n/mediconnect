// User Service - Business logic for user management
import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'mediconnect_admin' | 'hospital_admin' | 'medic' | 'patient';
  hospital_id?: string;
  department?: string;
  cnp?: string;
  avatar_url?: string;
  hospital?: {
    id: string;
    name: string;
  };
}

export interface UserFilters {
  role?: string;
  hospitalId?: string;
  search?: string;
}

export class UserService {
  constructor(private supabase: SupabaseClient) {}

  async getAll(filters?: UserFilters): Promise<UserProfile[]> {
    let query = this.supabase
      .from('profiles')
      .select('*, hospital:hospitals(id, name)')
      .order('full_name');

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    if (filters?.hospitalId) {
      query = query.eq('hospital_id', filters.hospitalId);
    }

    if (filters?.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async getById(id: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*, hospital:hospitals(id, name)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async getByEmail(email: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*, hospital:hospitals(id, name)')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  async update(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select('*, hospital:hospitals(id, name)')
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    // First delete the user's auth record
    const { error: authError } = await this.supabase.auth.admin.deleteUser(id);
    if (authError) throw authError;

    // Profile will be deleted via CASCADE
  }

  async getStats() {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('role');

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      mediconnect_admins: 0,
      hospital_admins: 0,
      medics: 0,
      patients: 0
    };

    data?.forEach(profile => {
      if (profile.role === 'mediconnect_admin') stats.mediconnect_admins++;
      else if (profile.role === 'hospital_admin') stats.hospital_admins++;
      else if (profile.role === 'medic') stats.medics++;
      else if (profile.role === 'patient') stats.patients++;
    });

    return stats;
  }

  async assignRole(userId: string, role: string, hospitalId?: string, department?: string): Promise<UserProfile> {
    const updates: Partial<UserProfile> = { role: role as UserProfile['role'] };
    
    if (hospitalId) updates.hospital_id = hospitalId;
    if (department) updates.department = department;

    return this.update(userId, updates);
  }
}

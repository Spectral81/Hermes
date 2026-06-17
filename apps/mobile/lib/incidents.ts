import type {
  CreateIncidentInput,
  Incident,
} from '@uteq/shared';
import { supabase } from './supabase';

export async function fetchIncidents(): Promise<Incident[]> {
  const { data, error } = await supabase.rpc('list_incidents');
  if (error) throw error;
  return (data ?? []) as Incident[];
}

export async function createIncident(input: CreateIncidentInput): Promise<Incident> {
  const { data, error } = await supabase.rpc('create_incident', {
    p_type: input.type,
    p_description: input.description,
    p_lat: input.lat,
    p_lng: input.lng,
    p_category: input.category ?? null,
    p_severity: input.severity ?? null,
  });
  if (error) throw error;
  return data as Incident;
}

export async function toggleLike(
  incidentId: string,
): Promise<{ likes_count: number; liked: boolean }> {
  const { data, error } = await supabase.rpc('toggle_incident_like', {
    p_incident_id: incidentId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { likes_count: number; liked: boolean };
}

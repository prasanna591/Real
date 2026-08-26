import { http } from '@/lib/http';
import type {
  AnalyticsSummary,
  BuilderPipeline,
  BuilderProjectSummary,
  BuilderSession,
  Floor,
  MediaAsset,
  Tower,
} from '@/types/api';

export function builderLogin(email: string, password: string): Promise<BuilderSession> {
  return http.post<BuilderSession>('/auth/login', { email, password });
}

export function listBuilderProjects(): Promise<BuilderProjectSummary[]> {
  return http.get<BuilderProjectSummary[]>('/builder/projects');
}

export function getBuilderPipeline(projectId: number): Promise<BuilderPipeline> {
  return http.get<BuilderPipeline>(`/builder/projects/${projectId}/pipeline`);
}

export interface CreateProjectPayload {
  name: string;
  slug: string;
  city: string;
  locality?: string;
  description?: string;
  property_type: string;
  starting_price?: number | null;
  amenities?: string[];
  status?: string;
}

export function createProject(payload: CreateProjectPayload): Promise<{ id: number }> {
  return http.post<{ id: number }>('/projects', payload);
}

export function createTower(projectId: number, name: string): Promise<Tower> {
  return http.post<Tower>(`/projects/${projectId}/towers`, { name });
}

export function createFloor(projectId: number, towerId: number, number: number): Promise<Floor> {
  return http.post<Floor>(`/projects/${projectId}/towers/${towerId}/floors`, { number });
}

export interface CreateUnitPayload {
  unit_number: string;
  bhk: number;
  area_sqft: number;
  facing?: string;
  price: number;
}

export function createUnit(
  projectId: number,
  towerId: number,
  floorId: number,
  payload: CreateUnitPayload
): Promise<{ id: number }> {
  return http.post<{ id: number }>(
    `/projects/${projectId}/towers/${towerId}/floors/${floorId}/units`,
    payload
  );
}

export function addMediaAsset(
  projectId: number,
  payload: { media_type: string; title: string; url: string }
): Promise<MediaAsset> {
  return http.post<MediaAsset>(`/projects/${projectId}/media`, payload);
}

export function getAnalyticsSummary(projectId: number): Promise<AnalyticsSummary> {
  return http.get<AnalyticsSummary>(`/projects/${projectId}/analytics/summary`);
}

export function updateProjectStatus(projectId: number, status: string): Promise<void> {
  return http.patch(`/projects/${projectId}`, { status });
}

export function updateUnitStatus(
  projectId: number,
  unitId: number,
  status: string
): Promise<void> {
  return http.patch(`/projects/${projectId}/units/${unitId}`, { status });
}

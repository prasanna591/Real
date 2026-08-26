import type {
  AssistantChatResult,
  ChatTurn,
  CustomerUser,
  Enquiry,
  Floor,
  MediaAsset,
  Project,
  ProjectListFilters,
  SavedItem,
  SiteVisit,
  TourConfig,
  Tower,
  Unit,
  UnitListFilters,
} from '@/types/api';
import { http } from '@/lib/http';

export async function listProjects(filters: ProjectListFilters = {}): Promise<Project[]> {
  return http.get<Project[]>('/api/v1/projects', {
    property_type: filters.propertyType,
    city: filters.city,
    status: filters.status,
  });
}

export async function getProject(projectId: number): Promise<Project> {
  return http.get<Project>(`/api/v1/projects/${projectId}`);
}

export async function listTowers(projectId: number): Promise<Tower[]> {
  return http.get<Tower[]>(`/api/v1/projects/${projectId}/towers`);
}

export async function listFloors(projectId: number, towerId: number): Promise<Floor[]> {
  return http.get<Floor[]>(`/api/v1/projects/${projectId}/towers/${towerId}/floors`);
}

export async function listUnits(
  projectId: number,
  filters: UnitListFilters = {},
): Promise<Unit[]> {
  return http.get<Unit[]>(`/api/v1/projects/${projectId}/units`, {
    status: filters.status,
    min_bhk: filters.minBhk,
    max_price: filters.maxPrice,
  });
}

export async function getUnit(projectId: number, unitId: number): Promise<Unit> {
  return http.get<Unit>(`/api/v1/projects/${projectId}/units/${unitId}`);
}

export async function listMedia(projectId: number): Promise<MediaAsset[]> {
  return http.get<MediaAsset[]>(`/api/v1/projects/${projectId}/media`);
}

export async function getTourConfig(projectId: number): Promise<TourConfig> {
  return http.get<TourConfig>(`/api/v1/projects/${projectId}/tour`);
}

export async function signIn(name: string, phone: string, email = ''): Promise<CustomerUser> {
  return http.post<CustomerUser>('/api/v1/users', { name, phone, email });
}

export async function saveItem(
  userId: number,
  target: { projectId?: number; unitId?: number },
): Promise<SavedItem> {
  return http.post<SavedItem>('/api/v1/saved', {
    user_id: userId,
    project_id: target.projectId ?? null,
    unit_id: target.unitId ?? null,
  });
}

export async function unsaveItem(itemId: number, sessionId = ''): Promise<void> {
  return http.delete<void>(
    `/api/v1/saved/${itemId}${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''}`,
  );
}

export async function listSaved(userId: number): Promise<SavedItem[]> {
  return http.get<SavedItem[]>(`/api/v1/users/${userId}/saved`);
}

export async function submitEnquiry(payload: {
  projectId: number;
  unitId?: number;
  name: string;
  phone: string;
  email?: string;
  message?: string;
}): Promise<Enquiry> {
  return http.post<Enquiry>('/api/v1/enquiries', {
    project_id: payload.projectId,
    unit_id: payload.unitId ?? null,
    name: payload.name,
    phone: payload.phone,
    email: payload.email ?? '',
    message: payload.message ?? '',
  });
}

export async function bookSiteVisit(payload: {
  projectId: number;
  unitId?: number;
  enquiryId?: number;
  visitorName: string;
  visitorPhone: string;
  scheduledAt: Date;
}): Promise<SiteVisit> {
  return http.post<SiteVisit>('/api/v1/site-visits', {
    project_id: payload.projectId,
    unit_id: payload.unitId ?? null,
    enquiry_id: payload.enquiryId ?? null,
    visitor_name: payload.visitorName,
    visitor_phone: payload.visitorPhone,
    scheduled_at: payload.scheduledAt.toISOString(),
  });
}

export async function sendAssistantChat(
  messages: ChatTurn[],
  projectId?: number,
  sessionId = '',
): Promise<AssistantChatResult> {
  return http.post<AssistantChatResult>('/api/v1/assistant/chat', {
    messages,
    project_id: projectId ?? null,
    session_id: sessionId,
  });
}

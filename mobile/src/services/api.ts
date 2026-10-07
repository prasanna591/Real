import type {
  AssistantChatResult,
  BuilderCard,
  ChatTurn,
  CustomerUser,
  Enquiry,
  FeedResponse,
  Floor,
  FollowRead,
  MediaAsset,
  MyEnquiry,
  Project,
  ProjectListFilters,
  SavedItem,
  SiteVisit,
  TourConfig,
  Tower,
  Unit,
  UnitListFilters,
} from '@/types/api';
import { http, ApiError } from '@/lib/http';
import { API_BASE_URL, API_TIMEOUT_MS } from '@/lib/config';

export async function listProjects(filters: ProjectListFilters = {}): Promise<Project[]> {
  return http.get<Project[]>('/api/v1/projects', {
    property_type: filters.propertyType,
    city: filters.city,
    status: filters.status,
    sort: filters.sort,
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

export async function listMyEnquiries(phone: string): Promise<MyEnquiry[]> {
  return http.get<MyEnquiry[]>('/api/v1/enquiries/me', { phone });
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

export async function listBuilderSuggestions(limit = 20): Promise<BuilderCard[]> {
  return http.get<BuilderCard[]>('/api/v1/social/builders', { limit });
}

export async function listFollowing(userId: number): Promise<BuilderCard[]> {
  return http.get<BuilderCard[]>(`/api/v1/social/users/${userId}/following`);
}

export async function followBuilder(userId: number, builderId: number): Promise<FollowRead> {
  return http.post<FollowRead>('/api/v1/social/follows', { user_id: userId, builder_id: builderId });
}

export async function unfollowBuilder(userId: number, builderId: number): Promise<void> {
  return http.delete<void>(
    `/api/v1/social/follows?user_id=${userId}&builder_id=${builderId}`,
  );
}

export async function getFeed(userId?: number): Promise<FeedResponse> {
  return http.get<FeedResponse>('/api/v1/social/feed', { user_id: userId });
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

export interface ListingRequestPayload {
  name: string;
  phone: string;
  email?: string;
  property_type?: string;
  bhk?: number;
  city?: string;
  locality?: string;
  expected_price?: string;
  description?: string;
}

export interface ListingRequestResult {
  id: number;
  user_id: number | null;
  name: string;
  phone: string;
  email: string;
  property_type: string;
  bhk: number | null;
  city: string;
  locality: string;
  expected_price: string;
  description: string;
  images: string[];
  status: string;
  created_at: string;
}

export async function submitListingRequest(
  payload: ListingRequestPayload,
): Promise<ListingRequestResult> {
  return http.post<ListingRequestResult>('/api/v1/listing-requests', {
    name: payload.name,
    phone: payload.phone,
    email: payload.email ?? '',
    property_type: payload.property_type ?? '',
    bhk: payload.bhk ?? null,
    city: payload.city ?? '',
    locality: payload.locality ?? '',
    expected_price: payload.expected_price ?? '',
    description: payload.description ?? '',
  });
}

export async function submitListingRequestImages(
  listingRequestId: number,
  imageUris: string[],
): Promise<ListingRequestResult> {
  const form = new FormData();
  for (const uri of imageUris) {
    const filename = uri.split('/').pop() ?? `photo-${Date.now()}.jpg`;
    form.append('images', {
      uri,
      name: filename,
      type: 'image/jpeg',
    } as unknown as Blob);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/listing-requests/${listingRequestId}/images`, {
      method: 'POST',
      body: form as unknown as BodyInit,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const detail =
        typeof data?.detail === 'string'
          ? data.detail
          : `Upload failed (${res.status})`;
      throw new ApiError(res.status, detail);
    }
    return data as ListingRequestResult;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(0, 'Upload timed out. Check your connection.');
    }
    throw new ApiError(0, 'Network error. Is the server running?');
  } finally {
    clearTimeout(timeout);
  }
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TOKEN_KEY = "proptech.builder.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
  }
}

/** api() wrapper that redirects to /login when the token is missing or expired. */
export async function requireApi<T>(
  path: string,
  options?: Parameters<typeof api<T>>[1],
): Promise<T> {
  try {
    return await api<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearToken();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- hard reset of all client state on session expiry
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    throw error;
  }
}

type QueryValue = string | number | boolean | undefined | null;

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export async function api<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; query?: Record<string, QueryValue> } = {},
): Promise<T> {
  const token = getToken();
  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : Array.isArray(data?.detail)
          ? data.detail.map((item: { msg?: string }) => item.msg).join(", ")
          : `Request failed (${response.status})`;
    throw new ApiError(response.status, detail);
  }
  return data as T;
}

// --- API types (mirror backend schemas) ---

export type PropertyType = "luxury_apartment" | "villa" | "premium_residence" | "waterfront";
export type ProjectStatus = "draft" | "active" | "sold_out";
export type UnitStatus = "available" | "booked" | "sold";
export type EnquiryStatus = "new" | "contacted" | "qualified" | "site_visit" | "booked" | "closed";

export interface BuilderUser {
  id: number;
  company_name: string;
  email: string;
}

export interface Project {
  id: number;
  slug: string;
  name: string;
  description: string;
  property_type: PropertyType;
  city: string;
  locality: string;
  starting_price: string | null;
  possession_date: string | null;
  amenities: string[];
  status: ProjectStatus;
  created_at: string;
}

export interface Tower {
  id: number;
  project_id: number;
  name: string;
}

export interface Floor {
  id: number;
  tower_id: number;
  number: number;
}

export interface Unit {
  id: number;
  floor_id: number;
  unit_number: string;
  bhk: number;
  area_sqft: number;
  facing: string;
  price: string;
  status: UnitStatus;
}

export type MediaType = "model_3d" | "floor_plan" | "photo" | "capture_360" | "ar_pack" | "interior_set";

export interface MediaAsset {
  id: number;
  project_id: number;
  media_type: MediaType;
  title: string;
  url: string;
}

export interface Enquiry {
  id: number;
  project_id: number;
  unit_id: number | null;
  name: string;
  phone: string;
  email: string;
  message: string;
  status: EnquiryStatus;
  created_at: string;
}

export interface SiteVisit {
  id: number;
  project_id: number;
  unit_id: number | null;
  enquiry_id: number | null;
  visitor_name: string;
  visitor_phone: string;
  scheduled_at: string;
  status: "scheduled" | "completed" | "cancelled";
}

export interface AnalyticsSummary {
  property_views: number;
  serious_explorers: number;
  saves: number;
  enquiries: number;
  site_visits: number;
  assistant_messages: number;
}

export interface ProjectSummary {
  id: number;
  name: string;
  slug: string;
  city: string;
  property_type: PropertyType | null;
  status: ProjectStatus | null;
  starting_price: number | null;
  unit_count: number;
  available_units: number;
}

export interface Pipeline {
  enquiries: Array<{
    id: number;
    name: string;
    phone: string;
    message: string | null;
    status: string;
    created_at: string;
  }>;
  site_visits: Array<{
    id: number;
    name: string;
    phone: string;
    scheduled_at: string;
    status: string;
  }>;
}

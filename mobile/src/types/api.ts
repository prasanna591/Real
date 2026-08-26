export type PropertyType =
  | 'luxury_apartment'
  | 'villa'
  | 'premium_residence'
  | 'waterfront';

export type ProjectStatus = 'draft' | 'active' | 'sold_out';

export type UnitStatus = 'available' | 'booked' | 'sold';

export type MediaType =
  | 'model_3d'
  | 'floor_plan'
  | 'photo'
  | 'capture_360'
  | 'ar_pack'
  | 'interior_set';

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

export interface MediaAsset {
  id: number;
  project_id: number;
  media_type: MediaType;
  title: string;
  url: string;
}

export interface TourViewpoint {
  id: number;
  project_id: number;
  name: string;
  description: string;
  target_x: number;
  target_y: number;
  target_z: number;
  distance: number;
  yaw: number;
  pitch: number;
  position: number;
}

export interface TourConfig {
  project_id: number;
  model_url: string | null;
  viewpoints: TourViewpoint[];
}

export interface CustomerUser {
  id: number;
  name: string;
  phone: string;
  email: string;
}

export interface SavedItem {
  id: number;
  user_id: number;
  project_id: number | null;
  unit_id: number | null;
}

export type EnquiryStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'site_visit'
  | 'booked'
  | 'closed';

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

export type VisitStatus = 'scheduled' | 'completed' | 'cancelled';

export interface SiteVisit {
  id: number;
  project_id: number;
  unit_id: number | null;
  enquiry_id: number | null;
  visitor_name: string;
  visitor_phone: string;
  scheduled_at: string;
  status: VisitStatus;
}

export type AnalyticsEventType =
  | 'view'
  | 'walkthrough_complete'
  | 'save'
  | 'unsave'
  | 'enquiry'
  | 'site_visit_booked'
  | 'booking'
  | 'assistant_message';

export interface AnalyticsSummary {
  property_views: number;
  serious_explorers: number;
  saves: number;
  enquiries: number;
  site_visits: number;
  assistant_messages?: number;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantChatResult {
  reply: string;
  engine: 'llm' | 'grounded';
  project_id: number | null;
}

export interface ProjectListFilters {
  propertyType?: PropertyType;
  city?: string;
  status?: ProjectStatus;
}

export interface UnitListFilters {
  status?: UnitStatus;
  minBhk?: number;
  maxPrice?: number;
}

export interface BuilderProjectSummary {
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

export interface PipelineEnquiry {
  id: number;
  name: string;
  phone: string;
  message: string | null;
  status: string;
  created_at: string;
}

export interface PipelineVisit {
  id: number;
  name: string;
  phone: string;
  scheduled_at: string;
  status: string;
}

export interface BuilderPipeline {
  enquiries: PipelineEnquiry[];
  site_visits: PipelineVisit[];
}

export type BuilderUser = {
  id: number;
  company_name: string;
  email: string;
};

export interface BuilderSession {
  token: string;
  user: BuilderUser;
}

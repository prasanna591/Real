/** EYD domain models — single source of truth for the homeowner product layer. */

export type BuildScope = 'new_home' | 'renovation' | 'extension';

export type HomeType = 'villa' | 'independent_house' | 'duplex' | 'apartment' | 'plot_house';

export type DesignStyle = 'modern' | 'traditional' | 'minimal' | 'luxury' | 'other';

export interface HomeProfile {
  scope: BuildScope;
  plotSizeSqft: number | null;
  floors: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  homeType: HomeType | null;
  budgetTotal: number;
  budgetRangeMin: number | null;
  budgetRangeMax: number | null;
  contingencyPct: number;
  style: DesignStyle | null;
  styleNote: string;
  createdAt: string;
  updatedAt: string;
}

export type StageId =
  | 'plan'
  | 'design'
  | 'approval'
  | 'foundation'
  | 'structure'
  | 'roof'
  | 'electrical'
  | 'plumbing'
  | 'interior'
  | 'complete';

export type StageStatus = 'completed' | 'current' | 'upcoming';

export interface ProjectStage {
  id: StageId;
  step: number;
  label: string;
  status: StageStatus;
  /** 0-100 completion inside this stage. */
  progress: number;
  note: string;
  updatedAt: string | null;
}

export type ProjectHealth = 'planning' | 'construction' | 'paused' | 'complete';

export interface EydProject {
  id: string;
  name: string;
  scope: BuildScope | null;
  homeType: HomeType | null;
  health: ProjectHealth;
  currentStageId: StageId;
  budgetTotal: number;
  startDate: string;
  targetEndDate: string;
  createdAt: string;
  updatedAt: string;
}

export type BudgetCategoryId =
  | 'land_site'
  | 'design'
  | 'materials'
  | 'labour'
  | 'construction'
  | 'electrical'
  | 'plumbing'
  | 'interiors'
  | 'other'
  | 'contingency';

export interface Expense {
  id: string;
  categoryId: BudgetCategoryId;
  title: string;
  amount: number;
  note: string;
  date: string;
  createdAt: string;
}

export type PaymentStatus = 'paid' | 'pending' | 'failed';

export interface Payment {
  id: string;
  amount: number;
  date: string;
  description: string;
  status: PaymentStatus;
  categoryId: BudgetCategoryId | null;
  createdAt: string;
}

export interface ProgressUpdate {
  id: string;
  stageId: StageId;
  note: string;
  /** Optional stage-specific completion override (0-100). */
  progress: number | null;
  photoUri: string | null;
  date: string;
  createdAt: string;
}

export type QuotationStatus = 'pending' | 'received' | 'compared' | 'accepted' | 'rejected';

export type MaterialCategory =
  | 'cement'
  | 'steel'
  | 'bricks'
  | 'tiles'
  | 'paint'
  | 'electrical'
  | 'plumbing'
  | 'doors'
  | 'windows'
  | 'sanitary';

export type MaterialAvailability = 'in_stock' | 'limited' | 'on_order';

/** Catalog item — SAMPLE data for the local material catalogue. */
export interface Material {
  id: string;
  category: MaterialCategory;
  product: string;
  unit: string;
  price: number;
  supplier: string;
  availability: MaterialAvailability;
  description: string;
}

export type DocumentCategory =
  | 'home_plan'
  | 'estimate'
  | 'boq'
  | 'quotations'
  | 'agreements'
  | 'bills'
  | 'approvals'
  | 'other';

/** Project document record — metadata only; `uri` points at a local file when attached. */
export interface EydDocument {
  id: string;
  category: DocumentCategory;
  name: string;
  /** File size in bytes when known. */
  size: number | null;
  date: string;
  /** 'sample' = seeded demo record, 'local' = created by the user on this device. */
  source: 'local' | 'sample';
  uri: string | null;
}

/** Passport: post-handover maintenance record. */
export interface MaintenanceEntry {
  id: string;
  title: string;
  note: string;
  cost: number | null;
  date: string;
  createdAt: string;
}

/** Passport: warranty / AMC record. */
export interface WarrantyEntry {
  id: string;
  item: string;
  provider: string;
  coverage: string;
  /** ISO date, null = no expiry recorded. */
  expiresOn: string | null;
  createdAt: string;
}

export interface QuotationItem {
  item: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface Quotation {
  id: string;
  /** Display name from the vendor (may be a professional from your network). */
  vendorName: string;
  /** Optional link to a Professional in the network catalogue. */
  vendorId: string | null;
  categoryId: BudgetCategoryId | null;
  /** Short scope label, e.g. "Interior fit-out". */
  scope: string;
  items: QuotationItem[];
  total: number;
  status: QuotationStatus;
  date: string;
  notes: string;
  createdAt: string;
}

export type ProfessionalCategory =
  | 'architect'
  | 'contractor'
  | 'structural'
  | 'interior'
  | 'electrician'
  | 'plumber'
  | 'supplier';

export interface Professional {
  id: string;
  category: ProfessionalCategory;
  name: string;
  profession: string;
  location: string;
  rating: number;
  projectsCompleted: number;
  verified: boolean;
  experienceYears: number;
  description: string;
  skills: string[];
  services: string[];
  /** Estimated pricing description, e.g. "₹180–₹250 / sq ft". */
  pricing: string;
  projects: { name: string; year: string; location: string }[];
  reviews: { author: string; rating: number; text: string }[];
}

export type AlertKind = 'budget' | 'project_update' | 'action_required' | 'upcoming';

/** Every in-app route an EYD alert/next-action may deep-link to. */
export type EydRoute = '/plan' | '/build/budget' | '/build/payments' | '/build/progress' | '/build/roadmap' | '/build/notifications' | '/build/network' | '/build/quotations' | '/build/materials' | '/build/documents' | '/build/passport';

export interface EydAlert {
  id: string;
  kind: AlertKind;
  title: string;
  body: string;
  route?: EydRoute;
}

export interface ActivityItem {
  id: string;
  text: string;
  kind: 'expense' | 'payment' | 'progress' | 'stage' | 'plan' | 'team' | 'quotation' | 'material' | 'document' | 'maintenance';
  createdAt: string;
}

export interface EydState {
  version: number;
  profile: HomeProfile | null;
  project: EydProject;
  stages: ProjectStage[];
  expenses: Expense[];
  payments: Payment[];
  progressUpdates: ProgressUpdate[];
  /** Offline catalogue of professionals (sample data — not verified). */
  professionals: Professional[];
  /** Ids of professionals added to the project team. */
  projectTeam: string[];
  quotations: Quotation[];
  /** Local material catalogue (sample data). */
  materials: Material[];
  /** Ids of catalogue materials added to the project list. */
  projectMaterials: string[];
  documents: EydDocument[];
  maintenance: MaintenanceEntry[];
  warranties: WarrantyEntry[];
  activity: ActivityItem[];
  readAlertIds: string[];
  updatedAt: string;
}

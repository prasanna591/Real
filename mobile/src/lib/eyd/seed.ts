import type {
  BudgetCategoryId,
  BuildScope,
  DesignStyle,
  EydProject,
  EydState,
  HomeType,
  Professional,
  ProfessionalCategory,
  ProjectStage,
  Quotation,
  QuotationItem,
  Material,
  MaterialCategory,
  MaterialAvailability,
  DocumentCategory,
  EydDocument,
  MaintenanceEntry,
  WarrantyEntry,
  StageId,
} from './types';

export const STAGE_ORDER: StageId[] = [
  'plan',
  'design',
  'approval',
  'foundation',
  'structure',
  'roof',
  'electrical',
  'plumbing',
  'interior',
  'complete',
];

export const STAGE_LABELS: Record<StageId, string> = {
  plan: 'Plan',
  design: 'Design',
  approval: 'Approval',
  foundation: 'Foundation',
  structure: 'Structure',
  roof: 'Roof',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  interior: 'Interior',
  complete: 'Complete',
};

export const BUDGET_CATEGORIES: { id: BudgetCategoryId; label: string }[] = [
  { id: 'land_site', label: 'Land / Site' },
  { id: 'design', label: 'Design' },
  { id: 'materials', label: 'Materials' },
  { id: 'labour', label: 'Labour' },
  { id: 'construction', label: 'Construction' },
  { id: 'electrical', label: 'Electrical' },
  { id: 'plumbing', label: 'Plumbing' },
  { id: 'interiors', label: 'Interiors' },
  { id: 'other', label: 'Other' },
  { id: 'contingency', label: 'Contingency' },
];

export const BUDGET_CATEGORY_LABEL: Record<BudgetCategoryId, string> = BUDGET_CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.id]: c.label }),
  {} as Record<BudgetCategoryId, string>,
);

/* ─── Professional network (SAMPLE — not verified) ─── */

export const PROFESSIONAL_CATEGORIES: ProfessionalCategory[] = [
  'architect',
  'contractor',
  'structural',
  'interior',
  'electrician',
  'plumber',
  'supplier',
];

export const PROFESSIONAL_CATEGORY_LABEL: Record<ProfessionalCategory, string> = {
  architect: 'Architect',
  contractor: 'Contractor',
  structural: 'Structural',
  interior: 'Interior',
  electrician: 'Electrician',
  plumber: 'Plumber',
  supplier: 'Supplier',
};

const rev = (author: string, rating: number, text: string) => ({ author, rating, text });
const proj = (name: string, year: string, location: string) => ({ name, year, location });
const pro = (p: Professional): Professional => p;

/** Sample profiles only — never claim they are real, verified or shortlisted. */
export const PROFESSIONALS: Professional[] = [
  pro({
    id: 'nw1', category: 'architect', name: 'Rahul Sethi', profession: 'Principal Architect', location: 'Whitefield, Bengaluru',
    rating: 4.8, projectsCompleted: 46, verified: true, experienceYears: 15,
    description: 'End-to-end residential design studio — concept, working drawings and site supervision for villas and row houses.',
    skills: ['Villa design', 'Working drawings', '3D visualisation', 'Vastu consulting'],
    services: ['Concept design', 'Detailed drawings', 'Structural coordination', 'Consultation / hr'],
    pricing: '₹120–₹180 / sq ft', projects: [proj('4 BHK Villa, Sarjapur', '2024', 'Bengaluru'), proj('Duplex, Electronic City', '2022', 'Bengaluru'), proj('Row house cluster', '2020', 'Mysuru')],
    reviews: [rev('Kavya R.', 5, 'Very structured process. Drawings were clear and the site team followed them closely.'), rev('Mohan I.', 4, 'Good design sense, slightly premium on pricing.')],
  }),
  pro({
    id: 'nw2', category: 'architect', name: 'Ananya Deshpande', profession: 'Design Consultant', location: 'Kothrud, Pune',
    rating: 4.6, projectsCompleted: 31, verified: true, experienceYears: 9,
    description: 'Boutique practice focused on space-planned, well-lit compact homes and interior-led elevations.',
    skills: ['Space planning', 'Elevation', 'Vastu', 'Material boards'],
    services: ['Concept + layout', 'Elevation design', 'Interior coordination', 'Consultation / hr'],
    pricing: '₹90–₹140 / sq ft', projects: [proj('3 BHK, Baner', '2024', 'Pune'), proj('Duplex, Wakad', '2021', 'Pune')],
    reviews: [rev('Sunil P.', 5, 'Fantastic at squeezing functionality out of small plots.')],
  }),
  pro({
    id: 'nw3', category: 'contractor', name: 'Karun Builders', profession: 'Turnkey Contractor', location: 'Electronic City, Bengaluru',
    rating: 4.7, projectsCompleted: 38, verified: true, experienceYears: 18,
    description: 'Turnkey construction: civil, finishing and MEP under one contract with weekly progress reporting.',
    skills: ['Turnkey execution', 'RCC structure', 'Finishing', 'Site management'],
    services: ['Estimation + BOQ', 'End-to-end build', 'Labour management', 'Progress reports'],
    pricing: '₹1,450–₹1,850 / sq ft', projects: [proj('4 BHK Villa, Kanakapura Rd', '2025', 'Bengaluru'), proj('G+3 apartment block', '2023', 'Bengaluru')],
    reviews: [rev('Arun M.', 5, 'One team for everything — civil, electrical, plumbing. Zero chasing.'), rev('Deepa K.', 4, 'Solid build quality. Material bills were transparent.')],
  }),
  pro({
    id: 'nw4', category: 'contractor', name: 'Shree Balaji Constructions', profession: 'Civil Contractor', location: 'Madhapur, Hyderabad',
    rating: 4.5, projectsCompleted: 27, verified: false, experienceYears: 12,
    description: 'Civil works specialist — foundations to slab casting, with own crane and pump setup.',
    skills: ['RCC', 'Slab casting', 'Brickwork', 'Waterproofing'],
    services: ['Civil execution', 'Slab casting', 'Brickwork', 'Labour crew'],
    pricing: '₹950–₹1,300 / sq ft', projects: [proj('3 BHK Villa, Gachibowli', '2024', 'Hyderabad')],
    reviews: [rev('Rakesh T.', 4, 'Fast slab cycle. Crew is disciplined.')],
  }),
  pro({
    id: 'nw5', category: 'structural', name: 'Dr. Srinivas Rao', profession: 'Structural Engineer', location: 'Jayanagar, Bengaluru',
    rating: 4.9, projectsCompleted: 90, verified: true, experienceYears: 22,
    description: 'RCC design and vetting for residential structures; foundation advice for tricky soils and gradients.',
    skills: ['RCC design', 'Foundation design', 'Peer review', 'Soil advice'],
    services: ['Structural design', 'Drawings approval', 'Peer review', 'Consultation / hr'],
    pricing: '₹15,000–₹45,000 / project', projects: [proj('Villa, Bannerghatta', '2025', 'Bengaluru'), proj('Row houses, Mysuru', '2023', 'Mysuru')],
    reviews: [rev('Harish N.', 5, 'Caught a slab-depth issue before casting — worth every rupee.')],
  }),
  pro({
    id: 'nw6', category: 'structural', name: 'Vani Structural Consultants', profession: 'Structural Design Firm', location: 'Ameerpet, Hyderabad',
    rating: 4.6, projectsCompleted: 54, verified: true, experienceYears: 16,
    description: 'Complete structural consultancy with fast turnaround on drawings and approvals.',
    skills: ['RCC design', '3D modeling', 'Approval drawings'],
    services: ['Structural drawings', 'Approval support', 'Supervision'],
    pricing: '₹18,000–₹50,000 / project', projects: [proj('Duplex, Kokapet', '2024', 'Hyderabad')],
    reviews: [rev('Farhan A.', 4, 'Approved drawings in 10 days.')],
  }),
  pro({
    id: 'nw7', category: 'interior', name: 'Casa Interior Studio', profession: 'Interior Designer', location: 'Koramangala, Bengaluru',
    rating: 4.7, projectsCompleted: 41, verified: true, experienceYears: 11,
    description: 'Warm-minimal residential interiors — modular kitchens, wardrobes, false ceilings and lighting design.',
    skills: ['Modular kitchen', 'Wardrobes', 'False ceiling', 'Lighting'],
    services: ['Full interior fit-out', 'Modular furniture', 'Turnkey finishing', 'Design + execute'],
    pricing: '₹1,200–₹1,900 / sq ft', projects: [proj('3 BHK, HSR Layout', '2025', 'Bengaluru'), proj('Penthouse, Indiranagar', '2023', 'Bengaluru')],
    reviews: [rev('Neha V.', 5, 'Loved the warm minimal palette. Handover was on time.')],
  }),
  pro({
    id: 'nw8', category: 'interior', name: 'Studio Nook', profession: 'Interior Architect', location: 'Baner, Pune',
    rating: 4.4, projectsCompleted: 19, verified: false, experienceYears: 7,
    description: 'Young studio heavy on joinery detail and carpentry-first interiors.',
    skills: ['Joinery', 'Carpentry', 'Paint palettes'],
    services: ['Interior design', 'Custom joinery', 'Execution'],
    pricing: '₹900–₹1,400 / sq ft', projects: [proj('2 BHK, Aundh', '2024', 'Pune')],
    reviews: [rev('Pooja S.', 4, 'Great woodwork. Slightly slow in execution.')],
  }),
  pro({
    id: 'nw9', category: 'electrician', name: 'Voltech Electricals', profession: 'Electrical Contractor', location: 'Marathahalli, Bengaluru',
    rating: 4.6, projectsCompleted: 62, verified: true, experienceYears: 14,
    description: 'Residential electrical: wiring design, panel boards, lighting, and safety checks with test certificates.',
    skills: ['Wiring', 'Panel design', 'Smart home', 'Testing'],
    services: ['Rough-in wiring', 'Panel + earthing', 'Fixture installation', 'Smart home wiring'],
    pricing: '₹65–₹90 / sq ft', projects: [proj('Villas, Sarjapur', '2025', 'Bengaluru'), proj('Apartment towers', '2024', 'Bengaluru')],
    reviews: [rev('Gopi C.', 5, 'Neat conduit work and a proper test report at the end.')],
  }),
  pro({
    id: 'nw10', category: 'electrician', name: 'PowerLine Services', profession: 'Electrical & Solar', location: 'Hinjawadi, Pune',
    rating: 4.3, projectsCompleted: 35, verified: false, experienceYears: 10,
    description: 'Electrical works plus rooftop solar design and installation.',
    skills: ['Wiring', 'Solar rooftop', 'Inverters'],
    services: ['Wiring + fixtures', 'Solar installation', 'Earthing'],
    pricing: '₹70–₹95 / sq ft', projects: [proj('Duplex, Hinjawadi', '2024', 'Pune')],
    reviews: [rev('Rajesh D.', 4, 'Good switchgear selection.')],
  }),
  pro({
    id: 'nw11', category: 'plumber', name: 'Aqua Flow Plumbing', profession: 'Plumbing Contractor', location: 'Hebbal, Bengaluru',
    rating: 4.5, projectsCompleted: 48, verified: true, experienceYears: 13,
    description: 'CPVC/PVC plumbing, drainage, sanitary fixtures and pressure-testing with warranty on joints.',
    skills: ['CPVC/PVC', 'Drainage', 'Sanitaryware', 'Pressure testing'],
    services: ['Rough plumbing', 'Drainage layout', 'Fixture fit-out', 'Leak checks'],
    pricing: '₹55–₹80 / sq ft', projects: [proj('Row houses, Yelahanka', '2025', 'Bengaluru'), proj('Villas, Devanahalli', '2023', 'Bengaluru')],
    reviews: [rev('Shweta B.', 5, 'No leaks in two monsoons since handover.')],
  }),
  pro({
    id: 'nw12', category: 'plumber', name: 'Mr. Lavanya Raj', profession: 'Plumbing & Sanitation', location: 'Secunderabad, Hyderabad',
    rating: 4.2, projectsCompleted: 26, verified: false, experienceYears: 9,
    description: 'Independent plumber for rough-in, fit-outs and repairs with fair rates.',
    skills: ['Rough-in', 'Sanitaryware', 'Pumps'],
    services: ['Rough-in', 'Fixture installation', 'Repairs'],
    pricing: '₹50–₹70 / sq ft', projects: [proj('3 BHK, Miyapur', '2024', 'Hyderabad')],
    reviews: [rev('Vikram S.', 4, 'Quick and clean work.')],
  }),
  pro({
    id: 'nw13', category: 'supplier', name: 'Metro Steel Traders', profession: 'Steel & Cement Supplier', location: 'Peenya, Bengaluru',
    rating: 4.6, projectsCompleted: 120, verified: true, experienceYears: 20,
    description: 'Wholesale TMT steel and cement with mill test certificates and site delivery.',
    skills: ['TMT steel', 'Cement', 'Site delivery'],
    services: ['TMT purchase', 'Cement supply', 'GST billing'],
    pricing: '₹72 / kg TMT · ₹380 / bag 43-grade', projects: [proj('Tower projects', '2025', 'Bengaluru'), proj('Residential villas', '2024', 'Bengaluru')],
    reviews: [rev('Anand K.', 5, 'Material matched the mill certificate. Fast delivery.')],
  }),
  pro({
    id: 'nw14', category: 'supplier', name: 'Tile Wealth', profession: 'Tiles & Sanitary Distributor', location: 'KR Market, Bengaluru',
    rating: 4.4, projectsCompleted: 85, verified: false, experienceYears: 11,
    description: 'Importer-distributor for vitrified tiles, sanitaryware and bath fittings across brands.',
    skills: ['Vitrified tiles', 'Sanitaryware', 'Bath fittings'],
    services: ['Tile supply', 'Sanitaryware', 'After-sales'],
    pricing: '₹38–₹85 / sq ft vitrified', projects: [proj('Apartment towers', '2025', 'Bengaluru'), proj('Villa interiors', '2024', 'Bengaluru')],
    reviews: [rev('Nikhil R.', 4, 'Good range and decent rates.')],
  }),
  pro({
    id: 'nw15', category: 'supplier', name: 'GreenBuild Supply', profession: 'Bricks, Blocks & Aggregates', location: 'Hosur Road, Bengaluru',
    rating: 4.5, projectsCompleted: 98, verified: true, experienceYears: 9,
    description: 'AAC blocks, red bricks, M-sand and aggregates with weighbridge-precise billing.',
    skills: ['AAC blocks', 'Red bricks', 'M-sand', 'Aggregates'],
    services: ['Block supply', 'Sand', 'Bulk delivery'],
    pricing: '₹54 / block AAC · ₹1,100 / ton M-sand', projects: [proj('G+3 residential', '2025', 'Bengaluru'), proj('Villas, Kanakapura Rd', '2024', 'Bengaluru')],
    reviews: [rev('Priya M.', 5, 'Exactly what was ordered, weight verified at site.')],
  }),
  pro({
    id: 'nw16', category: 'supplier', name: 'Lumen Lighting Co.', profession: 'Lighting & Electrical Retail', location: 'Banjara Hills, Hyderabad',
    rating: 4.3, projectsCompleted: 70, verified: false, experienceYears: 8,
    description: 'Indoor/outdoor lighting, fans, wires and switchgear with lighting-layout help.',
    skills: ['Decorative lighting', 'Switchgear', 'Fans'],
    services: ['Lighting supply', 'Switchgear', 'Lighting plan'],
    pricing: 'Market rates · bulk discounts', projects: [proj('Duplex, Jubilee Hills', '2025', 'Hyderabad')],
    reviews: [rev('Sneha G.', 4, 'Good advice on warm-white combinations.')],
  }),
  pro({
    id: 'nw17', category: 'contractor', name: 'Brick & Beam', profession: 'RCC + Finishing Contractor', location: 'Viman Nagar, Pune',
    rating: 4.6, projectsCompleted: 22, verified: true, experienceYears: 10,
    description: 'Mid-scale contractor for RCC shells and quality finishing work (plaster, flooring, painting).',
    skills: ['RCC shell', 'Plaster', 'Flooring', 'Painting'],
    services: ['Shell construction', 'Finishing', 'Waterproofing'],
    pricing: '₹1,150–₹1,500 / sq ft', projects: [proj('3 BHK + slope, Kharadi', '2025', 'Pune')],
    reviews: [rev('Abhijit W.', 5, 'Clean finishing, good plaster work.')],
  }),
  pro({
    id: 'nw18', category: 'interior', name: 'Frame & Flute', profession: 'Modular Furniture Studio', location: 'Sholinganallur, Chennai',
    rating: 4.5, projectsCompleted: 33, verified: true, experienceYears: 9,
    description: 'Modular kitchens and wardrobes with a 3-year warranty on hardware.',
    skills: ['Modular kitchen', 'Wardrobes', 'Hardware'],
    services: ['Kitchen', 'Wardrobes', 'Bar/study units'],
    pricing: '₹8,50,000 – ₹9,50,000 / full 3BHK kitchen+wardrobes', projects: [proj('3 BHK, OMR', '2025', 'Chennai')],
    reviews: [rev('Divya N.', 5, 'Sliding mechanisms still smooth after a year.')],
  }),
  pro({
    id: 'nw19', category: 'architect', name: 'Ar. Farhan Khan', profession: 'Architect', location: 'Gachibowli, Hyderabad',
    rating: 4.7, projectsCompleted: 24, verified: true, experienceYears: 12,
    description: 'Modern villa specialist with BIM drawings and 3D walkthroughs for photo-real design review.',
    skills: ['Villa design', 'BIM', '3D walkthrough'],
    services: ['Concept + drawings', '3D walkthrough', 'Consultation'],
    pricing: '₹110–₹160 / sq ft', projects: [proj('Villa, Kokapet', '2025', 'Hyderabad'), proj('Farm stay, Ananthagiri', '2023', 'Telangana')],
    reviews: [rev('Imran Q.', 5, 'The 3D walkthrough saved us from two layout mistakes.')],
  }),
  pro({
    id: 'nw20', category: 'structural', name: 'Steadfast Designs', profession: 'Structural Consultancy', location: 'Porur, Chennai',
    rating: 4.8, projectsCompleted: 63, verified: true, experienceYears: 17,
    description: 'Structurally efficient designs for coastal and high-wind zones with corrosion-resistant detailing.',
    skills: ['Coastal design', 'Corrosion detailing', 'RCC'],
    services: ['Structural design', 'Detailing', 'Site visits'],
    pricing: '₹16,000–₹48,000 / project', projects: [proj('Coastal villas, ECR', '2025', 'Chennai')],
    reviews: [rev('Meena R.', 5, 'Designed for cyclone load with sensible steel use.')],
  }),
];

/* ─── Quotations (SAMPLE — mock vendors) ─── */

const qi = (item: string, qty: number, unit: string, unitPrice: number): QuotationItem => ({
  item,
  qty,
  unit,
  unitPrice,
  total: Math.round(qty * unitPrice * 100) / 100,
});

const QUOTATIONS: Quotation[] = [
  {
    id: 'q1',
    vendorName: 'Casa Interior Studio',
    vendorId: 'nw7',
    categoryId: 'interiors',
    scope: 'Interior fit-out · 2,400 sq ft',
    items: [
      qi('Modular kitchen (32 modules)', 1, 'lot', 450000),
      qi('Wardrobes', 6, 'nos', 18500),
      qi('False ceiling + cornice', 2400, 'sq ft', 85),
      qi('Lighting package (warm white)', 1, 'lot', 120000),
      qi('Painting — 2 coats, emulsion', 2400, 'sq ft', 42),
    ],
    total: 0,
    status: 'received',
    date: isoDaysAgo(9),
    notes: 'Includes design supervision and 1-year warranty on hardware.',
    createdAt: isoDaysAgo(9),
  },
  {
    id: 'q2',
    vendorName: 'Studio Nook',
    vendorId: 'nw8',
    categoryId: 'interiors',
    scope: 'Interior fit-out · 2,400 sq ft',
    items: [
      qi('Modular kitchen (32 modules)', 1, 'lot', 385000),
      qi('Wardrobes', 6, 'nos', 15200),
      qi('False ceiling + cornice', 2400, 'sq ft', 72),
      qi('Lighting package (warm white)', 1, 'lot', 98000),
      qi('Painting — 2 coats, emulsion', 2400, 'sq ft', 38),
    ],
    total: 0,
    status: 'received',
    date: isoDaysAgo(7),
    notes: 'Budget segment. False ceiling uses standard POP.',
    createdAt: isoDaysAgo(7),
  },
  {
    id: 'q3',
    vendorName: 'Frame & Flute',
    vendorId: 'nw18',
    categoryId: 'interiors',
    scope: 'Interior fit-out · 2,400 sq ft',
    items: [
      qi('Modular kitchen (32 modules)', 1, 'lot', 495000),
      qi('Wardrobes', 6, 'nos', 21000),
      qi('False ceiling + cornice', 2400, 'sq ft', 96),
      qi('Lighting package (warm white)', 1, 'lot', 145000),
      qi('Painting — 2 coats, emulsion', 2400, 'sq ft', 48),
    ],
    total: 0,
    status: 'pending',
    date: isoDaysAgo(3),
    notes: 'Premium segment — branded hardware with 3-year warranty.',
    createdAt: isoDaysAgo(3),
  },
  {
    id: 'q4',
    vendorName: 'Metro Steel Traders',
    vendorId: 'nw13',
    categoryId: 'materials',
    scope: 'Steel — 5 tonnes TMT',
    items: [
      qi('TMT Fe500D bars', 5000, 'kg', 72),
      qi('Binding wire', 100, 'kg', 65),
      qi('Site delivery (2 trips)', 1, 'lot', 5000),
    ],
    total: 0,
    status: 'accepted',
    date: isoDaysAgo(74),
    notes: 'Mill test certificate shared with the quotation.',
    createdAt: isoDaysAgo(74),
  },
];
for (const q of QUOTATIONS) q.total = q.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);

/* ─── Material catalogue (SAMPLE) ─── */

export const MATERIAL_CATEGORIES: MaterialCategory[] = [
  'cement',
  'steel',
  'bricks',
  'tiles',
  'paint',
  'electrical',
  'plumbing',
  'doors',
  'windows',
  'sanitary',
];

export const MATERIAL_CATEGORY_LABEL: Record<MaterialCategory, string> = {
  cement: 'Cement',
  steel: 'Steel',
  bricks: 'Bricks',
  tiles: 'Tiles',
  paint: 'Paint',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  doors: 'Doors',
  windows: 'Windows',
  sanitary: 'Sanitary',
};

const mat = (
  id: string,
  category: MaterialCategory,
  product: string,
  unit: string,
  price: number,
  supplier: string,
  availability: MaterialAvailability,
  description: string,
): Material => ({ id, category, product, unit, price, supplier, availability, description });

export const MATERIALS: Material[] = [
  mat('m1', 'cement', 'Ultratech PPC 53 Grade', '50 kg bag', 415, 'Metro Steel Traders', 'in_stock', 'ISI-certified, general RCC & masonry.'),
  mat('m2', 'cement', 'ACC Gold OPC 53', '50 kg bag', 425, 'Metro Steel Traders', 'in_stock', 'Higher early strength, good for slabs.'),
  mat('m3', 'cement', 'Ramco Premium PPC', '50 kg bag', 405, 'GreenBuild Supply', 'limited', 'Bulk orders only, subject to stock.'),
  mat('m4', 'steel', 'TMT Fe500D 8 mm', 'kg', 72, 'Metro Steel Traders', 'in_stock', 'BIS-marked, use for stirrups & ties.'),
  mat('m5', 'steel', 'TMT Fe500D 10 mm', 'kg', 71, 'Metro Steel Traders', 'in_stock', 'BIS-marked, distribution steel.'),
  mat('m6', 'steel', 'TMT Fe500D 12 mm', 'kg', 70, 'Metro Steel Traders', 'limited', 'Main bars — stock moves fast in season.'),
  mat('m7', 'bricks', 'AAC block 600×200×150', 'block', 54, 'GreenBuild Supply', 'in_stock', 'Lightweight, fast walling, easy to chase.'),
  mat('m8', 'bricks', 'Red clay brick (table moulded)', 'nos', 9.5, 'GreenBuild Supply', 'limited', 'Classic walling brick, 74% burn quality.'),
  mat('m9', 'bricks', 'Solid concrete block 200 mm', 'nos', 42, 'GreenBuild Supply', 'in_stock', 'Load-bearing / compound walls.'),
  mat('m10', 'tiles', 'Vitrified tile 600×600', 'sq ft', 58, 'Tile Wealth', 'in_stock', 'Matt finish, floors throughout.'),
  mat('m11', 'tiles', 'Granite kitchen platform', 'sq ft', 145, 'Tile Wealth', 'in_stock', 'Absolute black, 20 mm, polished.'),
  mat('m12', 'tiles', 'Parking-grade vitrified', 'sq ft', 44, 'Tile Wealth', 'limited', 'Anti-skid, for porch & parking.'),
  mat('m13', 'paint', 'Interior emulsion (2 coats)', 'sq ft', 42, 'Lumen Lighting Co.', 'in_stock', 'Washable matte, low VOC.'),
  mat('m14', 'paint', 'Exterior weatherproof paint', 'litre', 480, 'Lumen Lighting Co.', 'limited', 'Sun & monsoon protection, 5-yr film.'),
  mat('m15', 'paint', 'Wall primer', 'litre', 240, 'Lumen Lighting Co.', 'in_stock', 'Alkali-resistant, covers cracks < 1 mm.'),
  mat('m16', 'electrical', 'Copper wire 1.5 sq mm (90 m)', 'roll', 1150, 'Lumen Lighting Co.', 'in_stock', 'FR-grade, lighting circuits.'),
  mat('m17', 'electrical', 'Modular switch (6 A)', 'nos', 185, 'Lumen Lighting Co.', 'in_stock', '10 A rated, matte white.'),
  mat('m18', 'electrical', 'MCB 32 A (C curve)', 'nos', 640, 'Lumen Lighting Co.', 'limited', 'For power circuits & pumps.'),
  mat('m19', 'plumbing', 'CPVC pipe 25 mm (3 m)', 'length', 320, 'Aqua Flow Plumbing', 'in_stock', 'Hot & cold water lines.'),
  mat('m20', 'plumbing', 'PVC drain pipe 110 mm (3 m)', 'length', 540, 'Aqua Flow Plumbing', 'in_stock', 'Soil/waste lines, 75 mm fall per 3 m.'),
  mat('m21', 'plumbing', 'CPVC elbow 25 mm', 'nos', 55, 'Aqua Flow Plumbing', 'in_stock', 'Solvent-welded fittings.'),
  mat('m22', 'doors', 'Flush door 35 mm, 7×3 ft', 'nos', 6800, 'Tile Wealth', 'in_stock', 'Hardwood frame, melamine face.'),
  mat('m23', 'doors', 'Teak frame + shutter (main)', 'nos', 34000, 'Frame & Flute', 'on_order', 'Made to order, 3–4 week lead.'),
  mat('m24', 'doors', 'Lockset + handles (set)', 'nos', 1450, 'Tile Wealth', 'in_stock', 'SS plate lockset, keyed alike.'),
  mat('m25', 'windows', 'UPVC sliding 4×4 ft', 'nos', 12500, 'Studio Nook', 'limited', 'Double glazed, mosquito track.'),
  mat('m26', 'windows', 'Aluminium grill window', 'nos', 8900, 'GreenBuild Supply', 'in_stock', 'Powder-coated grill + glass.'),
  mat('m27', 'windows', 'Mosquito mesh panel', 'nos', 1850, 'Studio Nook', 'in_stock', 'Fibrous mesh, removable.'),
  mat('m28', 'sanitary', 'One-piece WC', 'nos', 11500, 'Tile Wealth', 'in_stock', '4.5 L flush, soft close seat.'),
  mat('m29', 'sanitary', 'Table-top wash basin', 'nos', 4200, 'Tile Wealth', 'in_stock', 'Ceramic white, 450 mm.'),
  mat('m30', 'sanitary', 'Shower mixer, wall mount', 'nos', 3650, 'Aqua Flow Plumbing', 'limited', '35 mm CPVC body, chrome finish.'),
];

/* ─── Project documents (SAMPLE records) ─── */

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'home_plan',
  'estimate',
  'boq',
  'quotations',
  'agreements',
  'bills',
  'approvals',
  'other',
];

const doc = (
  id: string,
  category: DocumentCategory,
  name: string,
  sizeMb: number | null,
  daysAgo: number,
  source: 'local' | 'sample' = 'sample',
): EydDocument => ({
  id,
  category,
  name,
  size: sizeMb === null ? null : Math.round(sizeMb * 1024 * 1024),
  date: isoDaysAgo(daysAgo),
  source,
  uri: null,
});

export const EYD_DOCUMENTS: EydDocument[] = [
  doc('d1', 'home_plan', 'G+1 Floor Plan — 4BHK Villa.pdf', 4.2, 150),
  doc('d2', 'home_plan', 'Elevation concepts (3D views).jpg', 7.8, 132),
  doc('d3', 'estimate', 'Architect estimate — revised.xlsx', 0.3, 130),
  doc('d4', 'boq', 'BOQ — interior fit-out.xlsx', 0.4, 12),
  doc('d5', 'quotations', 'Vendor quotations — consolidated.pdf', 1.1, 7),
  doc('d6', 'agreements', 'Contractor agreement (signed).pdf', 2.3, 148),
  doc('d7', 'bills', 'Cement & steel bills — batch 1.pdf', 0.9, 96),
  doc('d8', 'bills', 'Labour payout receipts.pdf', 0.2, 52, 'local'),
  doc('d9', 'approvals', 'Building plan approval letter.pdf', 1.4, 128),
  doc('d10', 'other', 'Site survey & soil report.pdf', 3.6, 155),
];

/* ─── Passport: maintenance & warranties (SAMPLE) ─── */

const maint = (id: string, title: string, note: string, cost: number | null, daysAgo: number): MaintenanceEntry => ({
  id,
  title,
  note,
  cost,
  date: isoDaysAgo(daysAgo),
  createdAt: isoDaysAgo(daysAgo),
});

export const MAINTENANCE_ENTRIES: MaintenanceEntry[] = [
  maint('mt1', 'Monsoon waterproofing check', 'Terrace & external walls inspected; minor crack sealed.', 4500, 20),
  maint('mt2', 'Overhead water tank cleaning', '2 nos tanks cleaned and disinfected.', 2200, 75),
  maint('mt3', 'Servo stabiliser service', 'Annual service of AC stabiliser unit.', 1500, 140),
];

const warranty = (id: string, item: string, provider: string, coverage: string, expiresInDays: number | null): WarrantyEntry => ({
  id,
  item,
  provider,
  coverage,
  expiresOn: expiresInDays === null ? null : isoDaysAgo(-expiresInDays),
  createdAt: isoDaysAgo(150),
});

export const WARRANTY_ENTRIES: WarrantyEntry[] = [
  warranty('w1', 'Modular kitchen & wardrobes', 'Casa Interior Studio', '3-year hardware warranty', 900),
  warranty('w2', 'RO water purifier', 'Aquaguard', '1-year AMC incl. filters', 210),
  warranty('w3', 'Roof waterproofing membrane', 'Site contractor', '5-year leak-free warranty', 1600),
];

export const SCOPE_LABELS: Record<BuildScope, string> = {
  new_home: 'New Home',
  renovation: 'Renovation',
  extension: 'Extension',
};

export const HOME_TYPE_LABELS: Record<HomeType, string> = {
  villa: 'Villa',
  independent_house: 'Independent House',
  duplex: 'Duplex',
  apartment: 'Apartment',
  plot_house: 'Plot + House',
};

export const DESIGN_STYLE_LABELS: Record<DesignStyle, string> = {
  modern: 'Modern',
  traditional: 'Traditional',
  minimal: 'Minimal',
  luxury: 'Luxury',
  other: 'Other',
};

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function isoDaysAhead(days: number): string {
  return isoDaysAgo(-days);
}

export function createStages(): ProjectStage[] {
  const seedProgress: Record<StageId, number> = {
    plan: 100,
    design: 100,
    approval: 100,
    foundation: 100,
    structure: 20,
    roof: 0,
    electrical: 0,
    plumbing: 0,
    interior: 0,
    complete: 0,
  };
  const notes: Partial<Record<StageId, string>> = {
    foundation: 'Column footings poured and cured',
    structure: 'Slab casting in progress — grid B to E',
  };

  return STAGE_ORDER.map((id, index) => {
    const progress = seedProgress[id];
    const status =
      progress >= 100 ? 'completed' : index === 4 ? 'current' : 'upcoming';
    return {
      id,
      step: index + 1,
      label: STAGE_LABELS[id],
      status,
      progress,
      note: notes[id] ?? '',
      updatedAt: progress > 0 ? isoDaysAgo(30 - index * 4) : null,
    } satisfies ProjectStage;
  });
}

export function createProject(): EydProject {
  return {
    id: 'eyd-project-1',
    name: 'My Dream Home',
    scope: 'new_home',
    homeType: 'villa',
    health: 'construction',
    currentStageId: 'structure',
    budgetTotal: 2000000,
    startDate: isoDaysAgo(150),
    targetEndDate: isoDaysAhead(240),
    createdAt: isoDaysAgo(160),
    updatedAt: isoDaysAgo(1),
  };
}

/** Realistic starter data so the dashboard is never an empty shell. */
export function createSeedState(): EydState {
  const now = new Date().toISOString();
  const expense = (
    id: string,
    categoryId: BudgetCategoryId,
    title: string,
    amount: number,
    daysAgo: number,
    note = '',
  ) => ({
    id,
    categoryId,
    title,
    amount,
    note,
    date: isoDaysAgo(daysAgo),
    createdAt: isoDaysAgo(daysAgo),
  });

  return {
    version: 1,
    profile: {
      scope: 'new_home',
      plotSizeSqft: 2400,
      floors: 2,
      bedrooms: 4,
      bathrooms: 3,
      parking: 2,
      homeType: 'villa',
      budgetTotal: 2000000,
      budgetRangeMin: 1800000,
      budgetRangeMax: 2200000,
      contingencyPct: 5,
      style: 'modern',
      styleNote: 'Warm minimal interiors, natural light',
      createdAt: isoDaysAgo(160),
      updatedAt: isoDaysAgo(30),
    },
    project: createProject(),
    stages: createStages(),
    expenses: [
      expense('e1', 'land_site', 'Site registration & mutation', 600000, 150),
      expense('e2', 'design', 'Architect drawings + 3D', 75000, 132, '4 BHK villa, 2 floors'),
      expense('e3', 'materials', 'Cement — 300 bags', 180000, 96, 'Ultratech PPC'),
      expense('e4', 'materials', 'Steel — 5 tonnes', 320000, 74, 'TMT Fe500D'),
      expense('e5', 'materials', 'Aggregates & sand', 60000, 66),
      expense('e6', 'construction', 'Foundation & footing works', 250000, 58),
      expense('e7', 'labour', 'Mason & helper crew (phase 1)', 150000, 52),
      expense('e8', 'materials', 'Bricks & blocks', 100000, 40),
      expense('e9', 'electrical', 'Conduit & wiring rough-in', 45000, 22),
      expense('e10', 'plumbing', 'CPVC piping & fixtures (rough)', 35000, 18),
      expense('e11', 'other', 'Site supervision & permits', 15000, 12),
      expense('e12', 'contingency', 'Monsoon contingency buffer', 30000, 8),
    ],
    payments: [
      {
        id: 'p1',
        amount: 900000,
        date: isoDaysAgo(150),
        description: 'Advance to contractor',
        status: 'paid',
        categoryId: 'construction',
        createdAt: isoDaysAgo(150),
      },
      {
        id: 'p2',
        amount: 460000,
        date: isoDaysAgo(80),
        description: 'Material purchase — steel & cement',
        status: 'paid',
        categoryId: 'materials',
        createdAt: isoDaysAgo(80),
      },
      {
        id: 'p3',
        amount: 240000,
        date: isoDaysAgo(50),
        description: 'Labour payout — phase 1',
        status: 'paid',
        categoryId: 'labour',
        createdAt: isoDaysAgo(50),
      },
      {
        id: 'p4',
        amount: 300000,
        date: isoDaysAgo(10),
        description: 'Contractor interim invoice',
        status: 'pending',
        categoryId: 'construction',
        createdAt: isoDaysAgo(10),
      },
    ],
    progressUpdates: [
      {
        id: 'pu1',
        stageId: 'foundation',
        note: 'Footings cured, DPC laid. Blockwork started on grid A.',
        progress: 100,
        photoUri: null,
        date: isoDaysAgo(28),
        createdAt: isoDaysAgo(28),
      },
      {
        id: 'pu2',
        stageId: 'structure',
        note: 'Column reinforcement tied for floor 1. Slab shuttering 60% done.',
        progress: 20,
        photoUri: null,
        date: isoDaysAgo(6),
        createdAt: isoDaysAgo(6),
      },
    ],
    professionals: PROFESSIONALS,
    projectTeam: [],
    quotations: QUOTATIONS,
    materials: MATERIALS,
    projectMaterials: [],
    documents: EYD_DOCUMENTS,
    maintenance: MAINTENANCE_ENTRIES,
    warranties: WARRANTY_ENTRIES,
    activity: [
      { id: 'a1', text: 'Contractor uploaded structure progress', kind: 'progress', createdAt: isoDaysAgo(6) },
      { id: 'a2', text: 'New material quotation received — flooring tiles', kind: 'expense', createdAt: isoDaysAgo(5) },
      { id: 'a3', text: 'Payment recorded — ₹1,50,000 labour payout', kind: 'payment', createdAt: isoDaysAgo(50) },
      { id: 'a4', text: 'Stage marked complete — Foundation', kind: 'stage', createdAt: isoDaysAgo(28) },
      { id: 'a5', text: 'Home plan generated from planner', kind: 'plan', createdAt: isoDaysAgo(160) },
    ],
    readAlertIds: [],
    updatedAt: now,
  };
}

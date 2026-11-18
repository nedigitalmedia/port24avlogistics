/*
 * Port 24 icon family, drawn on a 24px grid.
 *
 * Rules: square joins and square corners (the Port 24 mark is four square L brackets), 1.75px stroke
 * (2px at 16px), one recognizable detail per icon. Round shapes appear only where the object is round
 * (people, wheels, dials, pins).
 *
 * Data format. `strokes`: path string | { d, dash } | { circle: [cx, cy, r] }.
 * `fills`: { d, opacity } | { circle: [cx, cy, r], opacity }. Plain data so React and the static sheet share it.
 *
 * Utility controls (search, close, settings...) stay standard icons from lucide so familiar controls stay familiar;
 * they are listed in UTILITY_ICONS and in the group table at the bottom.
 */
const BR = ['M4 9V4h5', 'M15 4h5v5', 'M4 15v5h5', 'M20 15v5h-5']; // the mark's four corner brackets
const DOC = ['M6 3.5h8.5l4 4V20.5H6z', 'M14.5 3.5v4h4'];            // a document with a folded corner

export const PORT24_ICONS = {
  // ── Operations ──
  dashboard: { label: 'Dashboard', strokes: ['M3.5 3.5h17v17h-17z', 'M10 3.5v17', 'M10 10h10.5'], fills: [{ d: 'M10 3.5h10.5V10H10z', opacity: 0.3 }] },
  projects: { label: 'Projects', strokes: ['M3.5 5.5h17v15h-17z', 'M3.5 9.5h17', 'M8 3.5v4', 'M16 3.5v4'], fills: [{ d: 'M7 13h6.5v3H7z', opacity: 1 }] },
  scan: { label: 'Scan', strokes: [...BR, 'M9 10v4', 'M12 8.5v7', 'M15 10v4'], fills: [] },
  avHospital: { label: 'AV Hospital', strokes: ['M3.5 7.5h17v12h-17z', 'M9 7.5V5h6v2.5', 'M12 10.5v6', 'M9 13.5h6'], fills: [] },
  availability: { label: 'Availability', strokes: ['M3.5 4.5h17v16h-17z', 'M9.2 4.5v16', 'M14.8 4.5v16', 'M3.5 9.8h17', 'M3.5 15.1h17'], fills: [{ d: 'M9.2 9.8h5.6v5.3H9.2z', opacity: 0.35 }] },
  alerts: { label: 'Alerts', strokes: ['M12 3.5l9 16.5H3z', 'M12 9.5v5'], fills: [{ circle: [12, 17.2, 1], opacity: 1 }] },
  missionControl: { label: 'Mission Control', strokes: [...BR, 'M7 12h3l1.5-3 2 6L15 12h2'], fills: [] },
  utilization: { label: 'Utilization', strokes: ['M3.5 20.5h17'], fills: [{ d: 'M5.5 13h3v7.5h-3z', opacity: 1 }, { d: 'M10.5 6h3v14.5h-3z', opacity: 1 }, { d: 'M15.5 10h3v10.5h-3z', opacity: 1 }] },

  // ── Inventory ──
  assets: { alias: 'rack', label: 'Assets' },
  kits: { label: 'Kits', strokes: ['M12 3.5l9 4.5-9 4.5L3 8z', 'M3 12.5l9 4.5 9-4.5', 'M3 16.5l9 4.5 9-4.5'], fills: [{ d: 'M12 3.5l9 4.5-9 4.5L3 8z', opacity: 0.3 }] },
  physicalKit: { alias: 'roadCase', label: 'Physical Kit' },
  cloudKit: { label: 'Cloud Kit', strokes: [{ d: 'M12 3.5l9 4.5-9 4.5L3 8z', dash: true }, 'M3 12.5l9 4.5 9-4.5', 'M3 16.5l9 4.5 9-4.5'], fills: [] },
  assignBarcodes: { label: 'Assign Barcodes', strokes: ['M3.5 3.5h8.5l8.5 8.5-8.5 8.5-8.5-8.5z', 'M11 12.5l1.5-1.5', 'M13.5 15l3-3'], fills: [{ circle: [7.6, 7.6, 1.3], opacity: 1 }] },
  categories: { label: 'Categories', strokes: ['M3.5 3.5h7v7h-7z', 'M13.5 3.5h7v7h-7z', 'M3.5 13.5h7v7h-7z', 'M13.5 13.5h7v7h-7z'], fills: [{ d: 'M13.5 13.5h7v7h-7z', opacity: 0.35 }] },
  movementLog: { label: 'Movement Log', strokes: ['M4 8h15', 'M15.5 4.5L19 8l-3.5 3.5', 'M20 16H5', 'M8.5 12.5L5 16l3.5 3.5'], fills: [] },
  containers: { label: 'Containers', strokes: ['M3.5 4.5h17v4h-17z', 'M5 8.5v12h14v-12', 'M10 12.5h4'], fills: [] },

  // ── People and places ──
  employees: { label: 'Employees', strokes: [{ circle: [9, 8, 3] }, 'M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20', { circle: [17, 9, 2.5] }, 'M16 14.2a4.5 4.5 0 0 1 5 4.3V20'], fills: [] },
  crewBookings: { label: 'Crew Bookings', strokes: ['M3.5 5.5h17v15h-17z', 'M3.5 9.5h17', 'M8 3.5v4', 'M16 3.5v4', 'M8.5 15l2.5 2.5 4.5-5'], fills: [] },
  crewMode: { label: 'Crew Mode', strokes: ['M4.5 14v-2a7.5 7.5 0 0 1 15 0v2', 'M3.5 14h3.5v6H3.5z', 'M17 14h3.5v6H17z', 'M20.5 20v1.5h-5.5'], fills: [] },
  myProfile: { label: 'My Profile', strokes: ['M4.5 3.5h15v17h-15z', { circle: [12, 9.5, 2.5] }, 'M7.5 17a4.5 4.5 0 0 1 9 0'], fills: [] },
  clients: { label: 'Clients', strokes: ['M3.5 20.5h17', 'M5 20.5v-16h9v16', 'M14 9.5h5v11'], fills: [{ d: 'M7.5 7.5h1.75v1.75H7.5z', opacity: 1 }, { d: 'M10.5 7.5h1.75v1.75H10.5z', opacity: 1 }, { d: 'M7.5 11.5h1.75v1.75H7.5z', opacity: 1 }, { d: 'M10.5 11.5h1.75v1.75H10.5z', opacity: 1 }] },
  venues: { label: 'Venues', strokes: ['M12 21s6.5-6 6.5-11a6.5 6.5 0 0 0-13 0c0 5 6.5 11 6.5 11z', { circle: [12, 10, 2.25] }], fills: [] },
  roundtable: { label: 'Roundtable', strokes: [{ circle: [12, 12, 4.25] }], fills: [{ d: 'M10.75 3.5h2.5v3h-2.5z', opacity: 1 }, { d: 'M10.75 17.5h2.5v3h-2.5z', opacity: 1 }, { d: 'M3.5 10.75h3v2.5h-3z', opacity: 1 }, { d: 'M17.5 10.75h3v2.5h-3z', opacity: 1 }] },
  rooms: { label: 'Rooms', strokes: ['M4.5 3.5h15v17h-15z', 'M4.5 12h7.5v8.5', 'M12 3.5v4'], fills: [] },

  // ── Finance and documents ──
  quotes: { label: 'Quotes', strokes: [...DOC, 'M9 12h6', 'M9 15.5h4'], fills: [] },
  invoices: { label: 'Invoices', strokes: ['M6 3.5h12v17l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5z', 'M9 8h6', 'M9 11.5h6'], fills: [{ d: 'M9 14.5h3v1.75H9z', opacity: 1 }] },
  billingDashboard: { label: 'Billing Dashboard', strokes: ['M3.5 4.5h17v15h-17z', 'M3.5 8.5h17'], fills: [{ d: 'M6.5 15h2.5v2.5H6.5z', opacity: 1 }, { d: 'M10.75 12.5h2.5v5h-2.5z', opacity: 1 }, { d: 'M15 13.75h2.5v3.75H15z', opacity: 1 }] },
  financialReports: { label: 'Financial Reports', strokes: [...DOC], fills: [{ d: 'M9 14h1.5v4H9z', opacity: 1 }, { d: 'M11.75 11.5h1.5V18h-1.5z', opacity: 1 }, { d: 'M14.5 13h1.5v5h-1.5z', opacity: 1 }] },
  printTemplates: { label: 'Print Templates', strokes: ['M3.5 9.5h17v7h-17z', 'M7 9.5v-6h10v6', 'M7 14.5h10v6H7z', 'M9.5 17.5h5'], fills: [] },
  documentsPdfs: { label: 'Documents & PDFs', strokes: ['M9 3.5h7.5l3.5 3.5V17', 'M4.5 7.5h8l3.5 3.5v9.5H4.5z', 'M12.5 7.5V11H16', 'M7.5 15h5'], fills: [] },
  downloadPdf: { label: 'Download PDF', strokes: [...DOC, 'M12 10v6.5', 'M9 14l3 3 3-3'], fills: [] },
  invoiceDraft: { label: 'Invoice Draft', strokes: ['M5.5 3.5h9l4 4V11', 'M5.5 3.5v17h6', 'M14.5 3.5v4h4', 'M8.5 10h5', 'M8.5 13.5h3', 'M12.5 18l7-7 2.5 2.5-7 7h-2.5z'], fills: [] },

  // ── Warehouse and project actions ──
  runOfShow: { label: 'Run of Show', strokes: ['M4.5 5h2.5v2.5H4.5z', 'M4.5 10.75h2.5v2.5H4.5z', 'M4.5 16.5h2.5V19H4.5z', 'M10 6.25h10.5', 'M10 12h10.5', 'M10 17.75h10.5'], fills: [{ d: 'M4.5 5h2.5v2.5H4.5z', opacity: 1 }] },
  pickList: { label: 'Pick List', strokes: ['M5.5 4.5h13v16h-13z', 'M9 6V3h6v3', 'M8.5 11h7', 'M8.5 14.5h7', 'M8.5 18h4'], fills: [] },
  dispatch: { label: 'Dispatch', strokes: ['M2.5 6.5h12v10h-12z', 'M14.5 9.5h4l3 3.5v3.5h-7', { circle: [7, 18.5, 1.9] }, { circle: [17, 18.5, 1.9] }], fills: [] },
  onLocation: { label: 'On Location', strokes: ['M3.5 4.5h17v11h-17z', 'M12 15.5v5', 'M8 20.5h8'], fills: [{ d: 'M10.5 8l4 2.5-4 2.5z', opacity: 1 }] },
  return: { label: 'Return', strokes: ['M4 14.5V20.5h16V14.5', 'M4 14.5h4', 'M16 14.5h4', 'M12 3.5v10', 'M8.5 10L12 13.5l3.5-3.5'], fills: [] },
  assetReviews: { label: 'Asset Reviews', strokes: ['M5.5 3.5h13v17h-13z', 'M8 8.5l1.3 1.3L11.8 7.5', 'M13.5 8.7h3', 'M8 14.5l1.3 1.3L11.8 13.5', 'M13.5 14.7h3'], fills: [] },
  addEquipment: { label: 'Add Equipment', strokes: ['M3.5 3.5h17v17h-17z', 'M12 8v8', 'M8 12h8'], fills: [] },
  approveChange: { label: 'Approve Change', strokes: ['M5.5 3.5h9l4 4V11', 'M5.5 3.5v17h5.5', 'M14.5 3.5v4h4', 'M8.5 9h5', 'M12 17.5l3 3 5.5-6.5'], fills: [] },

  // ── Workspace and admin ──
  planUsage: { label: 'Plan & Usage', strokes: ['M3.5 17.5a8.5 8.5 0 0 1 17 0z', 'M12 17.5l4-6'], fills: [{ circle: [12, 17.5, 1.3], opacity: 1 }] },
  integrations: { label: 'Integrations', strokes: ['M3.5 3.5h8v8h-8z', 'M12.5 12.5h8v8h-8z', 'M11.5 7.5h5v5'], fills: [] },
  importInventory: { label: 'Import Inventory', strokes: ['M12 3.5v9.5', 'M8.5 9.5L12 13l3.5-3.5', 'M4 16.5h16', 'M4 20.5h16'], fills: [] },
  branding: { label: 'Branding', strokes: ['M3.5 4.5h17v15h-17z', 'M3.5 16.5l5-5 4 4 3-3 5 5'], fills: [{ circle: [16.5, 9, 1.4], opacity: 1 }] },
  allCompanies: { label: 'All Companies', strokes: ['M3.5 20.5h17', 'M5 20.5v-17h8v17', 'M13 8.5h6v12'], fills: [{ d: 'M7.5 6.5h1.75v1.75H7.5z', opacity: 1 }, { d: 'M7.5 10.5h1.75v1.75H7.5z', opacity: 1 }, { d: 'M7.5 14.5h1.75v1.75H7.5z', opacity: 1 }, { d: 'M15.25 12h1.75v1.75h-1.75z', opacity: 1 }] },
  switchCompany: { label: 'Switch Company', strokes: ['M3.5 3.5h6v6h-6z', 'M14.5 14.5h6v6h-6z', 'M12.5 6.5h8', 'M18 4l2.5 2.5L18 9', 'M11.5 17.5h-8', 'M6 15l-2.5 2.5L6 20'], fills: [{ d: 'M14.5 14.5h6v6h-6z', opacity: 0.35 }] },
  signOut: { label: 'Sign Out', strokes: ['M10 3.5H4.5v17H10', 'M9 12h11.5', 'M16.5 8l4 4-4 4'], fills: [] },

  // ── The first three (Road Case is Physical Kit, Rack is Assets) ──
  roadCase: {
    label: 'Road Case',
    strokes: ['M3.5 6.5h17v12h-17z', 'M3.5 11h6.75', 'M13.75 11h6.75', 'M10.25 9.25h3.5v3.5h-3.5z'],
    fills: [
      { d: 'M10.25 9.25h3.5v3.5h-3.5z', opacity: 0.3 },
      { d: 'M3.5 6.5h2.5v2.5H3.5z', opacity: 1 }, { d: 'M18 6.5h2.5v2.5H18z', opacity: 1 },
      { d: 'M3.5 16h2.5v2.5H3.5z', opacity: 1 }, { d: 'M18 16h2.5v2.5H18z', opacity: 1 },
    ],
  },
  rack: { label: 'Rack', strokes: ['M4.5 3.5h15v17h-15z', 'M4.5 9.17h15', 'M4.5 14.83h15', 'M7.5 6.33h5', 'M7.5 12h5', 'M7.5 17.67h5'], fills: [{ circle: [16.5, 12, 1.1], opacity: 1 }] },
};

/** Order and grouping follow the design reference sheet. */
export const PORT24_ICON_GROUPS = [
  { title: 'Operations', keys: ['dashboard', 'projects', 'scan', 'avHospital', 'availability', 'alerts', 'missionControl', 'utilization'] },
  { title: 'Inventory', keys: ['assets', 'kits', 'physicalKit', 'cloudKit', 'assignBarcodes', 'categories', 'movementLog', 'containers'] },
  { title: 'People & places', keys: ['employees', 'crewBookings', 'crewMode', 'myProfile', 'clients', 'venues', 'roundtable', 'rooms'] },
  { title: 'Finance & documents', keys: ['quotes', 'invoices', 'billingDashboard', 'financialReports', 'printTemplates', 'documentsPdfs', 'downloadPdf', 'invoiceDraft'] },
  { title: 'Warehouse & project actions', keys: ['runOfShow', 'pickList', 'dispatch', 'onLocation', 'return', 'assetReviews', 'addEquipment', 'approveChange'] },
  { title: 'Workspace & admin', keys: ['settings', 'planUsage', 'integrations', 'importInventory', 'branding', 'allCompanies', 'switchCompany', 'signOut'] },
  { title: 'Common controls (standard icons)', keys: ['search', 'filter', 'more', 'add', 'edit', 'delete', 'locked', 'back', 'expand', 'close'] },
];

/** Standard utility icons, kept from lucide so familiar controls stay familiar. */
export const UTILITY_ICONS = {
  settings: { lucide: 'Settings', label: 'Settings' },
  search: { lucide: 'Search', label: 'Search' },
  filter: { lucide: 'Filter', label: 'Filter' },
  more: { lucide: 'Ellipsis', label: 'More' },
  add: { lucide: 'Plus', label: 'Add' },
  edit: { lucide: 'Pencil', label: 'Edit' },
  delete: { lucide: 'Trash2', label: 'Delete' },
  locked: { lucide: 'Lock', label: 'Locked' },
  back: { lucide: 'ArrowLeft', label: 'Back' },
  expand: { lucide: 'ChevronDown', label: 'Expand' },
  close: { lucide: 'X', label: 'Close' },
};

export const resolveIcon = (name) => { const d = PORT24_ICONS[name]; return d?.alias ? { ...PORT24_ICONS[d.alias], label: d.label } : d; };

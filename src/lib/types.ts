export type Metric = "production" | "reserves" | "overburden" | "target";
export type ReviewStatus = "unreviewed" | "approved" | "rejected" | "corrected";
export interface Mine {
  id: string;
  name: string;
  alias: string[];
  subsidiary: string;
  state: string;
  district: string;
  lat: number;
  lng: number;
  type: string;
  opened: number;
}
export interface Document {
  id: string;
  mineId: string;
  title: string;
  filename: string;
  year: number;
  format: "PDF" | "Scanned PDF" | "Excel";
  status: "prepared";
  pages: number;
}
export interface Evidence {
  id: string;
  documentId: string;
  mineId: string;
  year: number;
  page: number;
  sheet?: string;
  cell?: string;
  excerpt: string;
  preview: string;
}
export interface Fact {
  id: string;
  mineId: string;
  year: number;
  metric: Metric;
  category: string;
  originalValue: number;
  originalUnit: string;
  value: number;
  unit: string;
  evidenceId: string;
  confidence: number;
  status: ReviewStatus;
  version: number;
}
export interface Chunk {
  id: string;
  mineId: string;
  year: number;
  text: string;
  evidenceId: string;
}
export interface Conflict {
  id: string;
  mineId: string;
  year: number;
  metric: Metric;
  category: string;
  factIds: string[];
  selectedFactId: string | null;
  version: number;
}
export interface Claim {
  text: string;
  evidenceIds: string[];
}
export interface Calculation {
  label: string;
  value: string;
  evidenceIds: string[];
}
export interface Answer {
  blocks: Claim[];
  calculations: Calculation[];
  mode: "numerical" | "descriptive" | "combined";
}
export interface ReportSection {
  title: string;
  claims: Claim[];
}
export interface Report {
  id: string;
  mineId: string;
  startYear: number;
  endYear: number;
  createdAt: string;
  status: "draft" | "approved";
  revision: number;
  evidenceFingerprint?: string;
  version: number;
  sections: ReportSection[];
}
export interface ReviewEvent {
  id: string;
  sessionId: string;
  action: string;
  recordId: string;
  before: unknown;
  after: unknown;
  at: string;
}
export interface Dataset {
  mines: Mine[];
  documents: Document[];
  evidence: Evidence[];
  facts: Fact[];
  chunks: Chunk[];
  conflicts: Conflict[];
  reports: Report[];
  events: ReviewEvent[];
  revision: number;
}
export interface Snapshot extends Dataset {
  connected: boolean;
  aiAvailable: boolean;
  storageError?: string;
}
export const metricLabel: Record<Metric, string> = {
  production: "Production",
  reserves: "Recoverable reserves",
  overburden: "Overburden",
  target: "Production target",
};

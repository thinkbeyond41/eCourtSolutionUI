// API client and mock data layer for eCourtSolutionUI
//
// Every method has two branches:
//   mock  — returns in-memory data (always works, no backend needed)
//   live  — calls the eCourtSolution backend at VITE_API_URL
//
// Mismatch notes (backend → UI normalisation done inside each live branch):
//   • court_type   backend: lowercase  →  UI: uppercase (DISTRICT/HIGH/SUPREME)
//   • paginated    backend: { items, total, page, page_size }  →  UI: flat array
//   • districts    backend: { state_code, districts: [] } + HTML in names  →  UI: { code, name }[]
//   • cause-lists  backend: single summary object  →  UI: CauseListResponse
//   • bulk jobs    backend: single job, different field names  →  UI: BulkJob[]

// ── Config ────────────────────────────────────────────────────────────────────

export const apiConfig = {
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  useMock: import.meta.env.VITE_USE_MOCK !== 'false',
  apiKey:  import.meta.env.VITE_API_KEY  ?? 'ecourt_dev_secret_key_12345',
};

// ── Error class ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable = false) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.retryable = retryable;
  }
}

// ── TypeScript interfaces ─────────────────────────────────────────────────────

export interface Court {
  id: string;
  court_type: 'DISTRICT' | 'HIGH' | 'SUPREME';
  name: string;
  state_code: string;
  state_name?: string | null;
  parent_id?: string | null;
  portal_url: string;
  cnr_prefix?: string | null;
  archive_bucket?: string | null;
  bench_code?: string | null;
}

export interface Judgment {
  cnr: string;
  title: string;
  petitioner: string;
  respondent: string;
  judge: string[];
  author_judge?: string | null;
  decision_date: string;
  court: Court;
  case_type: string;
  disposal_nature: string;
  citation?: string | null;
  neutral_citation?: string | null;
  available_languages: string[];
  source: 'ARCHIVE' | 'LIVE_PORTAL';
  pdf_url?: string | null;
}

export interface CaseOrder {
  id?: string;
  order_date: string;
  order_type: string;
  judge: string;
  pdf_url?: string | null;
  neutral_citation?: string | null;
}

// Structured party — populated from the parties table when available.
// Falls back to raw petitioner/respondent strings on CaseInfo for display.
export interface Party {
  party_type: 'petitioner' | 'respondent' | 'intervenor' | string;
  name: string;
  advocate_entity_id?: string | null;
}

// Individual hearing entry on a case.
export interface Hearing {
  hearing_date: string;
  purpose?: string | null;
  next_date?: string | null;
  judge?: string | null;
}

export interface CaseInfo {
  cnr: string;
  case_number: string;
  case_type: string;
  registration_date?: string | null;
  petitioner: string;
  respondent: string;
  advocate_petitioner: string;
  advocate_respondent: string;
  judges: string[];
  status: string;
  next_hearing_date?: string | null;
  court: Court;
  orders: CaseOrder[];
  // Structured parties and hearings — present when served from the persistence layer.
  // May be empty if the case was fetched live before being written to the cases table.
  parties?: Party[];
  hearings?: Hearing[];
}

export interface CauseListEntry {
  serial_number: number;
  case_number: string;
  case_type: string;
  petitioner: string;
  respondent: string;
  advocate_petitioner: string;
  advocate_respondent: string;
  judge: string;
  bench: string;
  court: Court;
  listing_date: string;
}

// Returned by getCauseList() — unified shape regardless of court tier.
// format="entries" → district/SCI courts, structured rows in entries[].
// format="pdf"     → high courts, pdf_url points to the downloadable PDF.
export interface CauseListResponse {
  court_id: string;
  court_name: string;
  listing_date: string;
  format: 'pdf' | 'entries';
  entries: CauseListEntry[];
  pdf_url: string | null;
  bench_code: string | null;
  bench_name: string | null;
  total_cases: number | null;
}

export interface CalcuttaOrder {
  order_date: string;
  order_type: string;
  judge: string;
  pdf_url: string | null;
  neutral_citation: string | null;
}

export interface CalcuttaResult {
  case: CaseInfo | null;
  orders: CalcuttaOrder[];
  total: number;
}

// Per-court stats for an advocate — sourced from entity_court_stats join table.
export interface AdvocateCourt {
  court_id: string;
  court_name: string;
  case_count: number;       // alias for total_cases, kept for display compat
  total_cases: number;
  pending_cases: number;
  disposed_cases: number;
  first_seen?: string | null;
  last_seen?: string | null;
}

export interface Advocate {
  id: string;
  canonical_name: string;
  name_variants: string[];
  courts: AdvocateCourt[];
  total_cases: number;
  pending_cases: number;
  disposed_cases: number;
  specializations: Record<string, number>;
  states: Record<string, number>;
  first_seen: string;
  last_seen: string;
}

// Per-court stats for a judge — sourced from entity_court_stats join table.
export interface JudgeCourt {
  court_id: string;
  court_name: string;
  start_date: string;        // alias for tenure_start, kept for display compat
  end_date?: string | null;  // alias for tenure_end
  tenure_start?: string | null;
  tenure_end?: string | null;
  total_judgments?: number;
  authored?: number;
  presided?: number;
}

export interface Judge {
  id: string;
  canonical_name: string;
  name_variants: string[];
  designation: string;
  courts: JudgeCourt[];
  total_judgments: number;
  authored: number;
  presided: number;
  disposal_breakdown: Record<string, number>;
  case_type_breakdown: Record<string, number>;
  is_active: boolean;
  tenure_start: string;
  tenure_end?: string | null;
}

export interface BulkJob {
  job_id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  court_id: string;
  year?: number;
  progress: number;
  records_processed: number;
  records_total: number;
  download_url?: string | null;
  created_at: string;
  expires_at?: string | null;
  error_message?: string | null;
}

export interface ResolutionReviewItem {
  id: string;
  entity_type: 'ADVOCATE' | 'JUDGE';
  name_a: string;
  name_b: string;
  similarity_score: number;
  details?: {
    court_a: string;
    court_b: string;
    cases_a: number;
    cases_b: number;
  };
}

export interface SeedStatus {
  job: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  year_current: number;
  year_total: number;
  records_added: number;
}

// Paginated response wrapper returned by search methods.
// page is 1-based; total_pages is derived by callers as Math.ceil(total / page_size).
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('X-API-Key', apiConfig.apiKey);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(`${apiConfig.baseUrl}${path}`, { ...options, headers });
  const envelope = await response.json() as { data: T; error?: { code: string; message: string; retryable?: boolean } | null };

  // The backend returns errors in the envelope body even for 2xx responses (e.g. CAPTCHA_FAILED)
  if (envelope.error) {
    throw new ApiError(
      envelope.error.message,
      envelope.error.code,
      envelope.error.retryable ?? false,
    );
  }

  if (!response.ok) {
    throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, `HTTP_${response.status}`);
  }

  return envelope.data;
}

// ── Normalisers ───────────────────────────────────────────────────────────────

// Backend sends court_type in lowercase; UI uses uppercase everywhere.
function normaliseCourt(raw: Record<string, unknown>): Court {
  return {
    ...(raw as unknown as Court),
    court_type: (raw.court_type as string).toUpperCase() as Court['court_type'],
  };
}

// District names from the backend contain residual HTML e.g. "Pune<\/option>"
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '').replace(/\\/g, '').trim();
}

// Normalise a raw judgment record from the backend into the UI's Judgment interface.
// Handles the following real-world divergences found in the live API:
//   • field is "judges" (plural) on the backend, "judge" (singular) in the UI type
//   • "source" is lowercase ("archive", "live_portal") — UI expects uppercase
//   • "judge" / "available_languages" can arrive as null, a string, or an array
//   • "pdf_url" can be a relative court-portal path — prepend base URL if needed
//   • "court.court_type" is lowercase — normalise to uppercase via normaliseCourt
function normaliseJudgment(raw: Record<string, unknown>): Judgment {
  // Backend uses "judges" (plural); fallback to "judge" if ever changed
  const rawJudges = (raw.judges ?? raw.judge) as string | string[] | null | undefined;
  const judges: string[] = Array.isArray(rawJudges)
    ? rawJudges
    : rawJudges ? [rawJudges] : [];

  const rawLangs = raw.available_languages as string | string[] | null | undefined;
  const langs: string[] = Array.isArray(rawLangs)
    ? rawLangs
    : rawLangs ? [rawLangs] : [];

  // source: "archive" → "ARCHIVE", "live_portal" → "LIVE_PORTAL"
  const source = ((raw.source as string) ?? 'archive')
    .toUpperCase() as Judgment['source'];

  // pdf_url: prepend base URL when the backend returns a relative court-portal path
  let pdfUrl = raw.pdf_url as string | null | undefined;
  if (pdfUrl && !pdfUrl.startsWith('http')) {
    pdfUrl = `${apiConfig.baseUrl}/${pdfUrl}`;
  }

  const rawCourt = raw.court as Record<string, unknown> | undefined;

  return {
    cnr:                 raw.cnr            as string,
    title:               raw.title          as string,
    petitioner:          raw.petitioner     as string ?? '',
    respondent:          raw.respondent     as string ?? '',
    decision_date:       raw.decision_date  as string,
    case_type:           (raw.case_type     as string) ?? '',
    disposal_nature:     (raw.disposal_nature as string) ?? '',
    citation:            (raw.citation      as string | null) ?? null,
    neutral_citation:    (raw.neutral_citation as string | null) ?? null,
    author_judge:        (raw.author_judge  as string | null) ?? null,
    judge:               judges,
    available_languages: langs,
    source,
    pdf_url:             pdfUrl ?? null,
    court:               rawCourt ? normaliseCourt(rawCourt) : {
      id: '', court_type: 'HIGH', name: 'Unknown Court',
      state_code: '', portal_url: '',
    },
  };
}

// Backend entity_court_stats / AdvocateCourt — normalise to AdvocateCourt shape.
function normaliseAdvocateCourt(raw: Record<string, unknown>): AdvocateCourt {
  const total = (raw.total_cases ?? raw.case_count ?? 0) as number;
  return {
    court_id:      raw.court_id      as string,
    court_name:    raw.court_name    as string,
    case_count:    total,
    total_cases:   total,
    pending_cases:  (raw.pending_cases  ?? 0) as number,
    disposed_cases: (raw.disposed_cases ?? 0) as number,
    first_seen:    (raw.first_seen  ?? null) as string | null,
    last_seen:     (raw.last_seen   ?? null) as string | null,
  };
}

// Backend entity_court_stats / JudgeCourt — normalise to JudgeCourt shape.
function normaliseJudgeCourt(raw: Record<string, unknown>): JudgeCourt {
  const tenureStart = (raw.tenure_start ?? raw.start_date ?? '') as string;
  const tenureEnd   = (raw.tenure_end   ?? raw.end_date   ?? null) as string | null;
  return {
    court_id:        raw.court_id    as string,
    court_name:      raw.court_name  as string,
    start_date:      tenureStart,
    end_date:        tenureEnd ?? undefined,
    tenure_start:    tenureStart,
    tenure_end:      tenureEnd,
    total_judgments: (raw.total_judgments ?? 0) as number,
    authored:        (raw.authored ?? 0) as number,
    presided:        (raw.presided ?? 0) as number,
  };
}

function normaliseAdvocate(raw: Advocate): Advocate {
  return {
    ...raw,
    courts:        Array.isArray(raw.courts)        ? (raw.courts as unknown as Record<string, unknown>[]).map(normaliseAdvocateCourt) : [],
    name_variants: Array.isArray(raw.name_variants) ? raw.name_variants : [],
    specializations: raw.specializations && typeof raw.specializations === 'object' ? raw.specializations : {},
    states:          raw.states          && typeof raw.states          === 'object' ? raw.states          : {},
  };
}

function normaliseJudge(raw: Judge): Judge {
  return {
    ...raw,
    courts:        Array.isArray(raw.courts)        ? (raw.courts as unknown as Record<string, unknown>[]).map(normaliseJudgeCourt) : [],
    name_variants: Array.isArray(raw.name_variants) ? raw.name_variants : [],
  };
}

// Map the backend bulk-job shape to the UI's BulkJob interface
// Backend: { job_id, status (lowercase), query: { court, year }, total_records, processed_records, ... }
// UI:      { job_id, status (uppercase), court_id, year, records_total, records_processed, progress, ... }
function normaliseBulkJob(raw: Record<string, unknown>): BulkJob {
  const query = (raw.query as Record<string, unknown>) ?? {};
  const total = (raw.total_records as number | null) ?? 0;
  const done  = (raw.processed_records as number | null) ?? 0;
  return {
    job_id:            raw.job_id as string,
    status:            ((raw.status as string) ?? 'PENDING').toUpperCase() as BulkJob['status'],
    court_id:          (query.court as string) ?? '',
    year:              query.year as number | undefined,
    records_total:     total,
    records_processed: done,
    progress:          total > 0 ? (done / total) * 100 : 0,
    download_url:      (raw.download_url as string | null) ?? null,
    created_at:        raw.created_at as string,
    expires_at:        (raw.expires_at as string | null) ?? null,
    error_message:     (raw.error_message as string | null) ?? null,
  };
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_COURTS: Court[] = [
  { id: 'sci',            court_type: 'SUPREME',  name: 'Supreme Court of India',            state_code: 'IN', portal_url: 'sci.gov.in',                   cnr_prefix: 'ESCR' },
  { id: 'delhi-hc',      court_type: 'HIGH',     name: 'Delhi High Court',                   state_code: 'DL', portal_url: 'delhihighcourt.nic.in',         cnr_prefix: 'DLHC' },
  { id: 'bombay-hc',     court_type: 'HIGH',     name: 'Bombay High Court',                  state_code: 'MH', portal_url: 'bombayhighcourt.nic.in',        cnr_prefix: 'BHC'  },
  { id: 'dc-mh-pune-001',court_type: 'DISTRICT', name: 'Pune District Court, Shivajinagar', state_code: 'MH', parent_id: 'bombay-hc', portal_url: 'services.ecourts.gov.in' },
];

const MOCK_CASES: CaseInfo[] = [
  {
    cnr: 'DLHC010023452024',
    case_number: 'WP(C) 1245/2024',
    case_type: 'Writ Petition (Civil)',
    registration_date: '2024-01-15',
    petitioner: 'M/S TechCorp Solutions Pvt Ltd',
    respondent: 'Union of India & Anr.',
    advocate_petitioner: 'Sandeep G. Mehta',
    advocate_respondent: 'Anjali Sharma (Govt. Pleader)',
    judges: ['Justice Rajiv Shakdher', 'Justice Girish Kathpalia'],
    status: 'PENDING',
    next_hearing_date: '2026-07-10',
    court: MOCK_COURTS[1],
    orders: [
      { order_date: '2024-01-18', order_type: 'Interim Order',      judge: 'Justice Rajiv Shakdher', pdf_url: '#' },
      { order_date: '2024-03-22', order_type: 'Adjournment Order',  judge: 'Justice Rajiv Shakdher', pdf_url: '#' },
    ],
    parties: [
      { party_type: 'petitioner', name: 'M/S TechCorp Solutions Pvt Ltd' },
      { party_type: 'respondent', name: 'Union of India' },
      { party_type: 'respondent', name: 'Ministry of Electronics & IT' },
    ],
    hearings: [
      { hearing_date: '2024-01-18', purpose: 'Admission',     judge: 'Justice Rajiv Shakdher', next_date: '2024-03-22' },
      { hearing_date: '2024-03-22', purpose: 'Arguments',     judge: 'Justice Rajiv Shakdher', next_date: '2026-07-10' },
      { hearing_date: '2026-07-10', purpose: 'Final Hearing', judge: null,                      next_date: null },
    ],
  },
  {
    cnr: 'MHAU010045672023',
    case_number: 'MA 456/2023',
    case_type: 'Miscellaneous Application',
    registration_date: '2023-06-10',
    petitioner: 'Rameshwar J. Patil',
    respondent: 'State of Maharashtra',
    advocate_petitioner: 'P. B. Shinde',
    advocate_respondent: 'V. S. Kadam',
    judges: ['Justice Devendra Kumar Upadhyaya'],
    status: 'DISPOSED',
    next_hearing_date: null,
    court: MOCK_COURTS[2],
    orders: [
      { order_date: '2023-06-12', order_type: 'Notice Issued',        judge: 'Justice Devendra Kumar Upadhyaya', pdf_url: '#' },
      { order_date: '2023-11-05', order_type: 'Final Disposal Order', judge: 'Justice Devendra Kumar Upadhyaya', pdf_url: '#' },
    ],
    parties: [
      { party_type: 'petitioner', name: 'Rameshwar J. Patil' },
      { party_type: 'respondent', name: 'State of Maharashtra' },
    ],
    hearings: [
      { hearing_date: '2023-06-12', purpose: 'Notice',          judge: 'Justice Devendra Kumar Upadhyaya', next_date: '2023-08-20' },
      { hearing_date: '2023-08-20', purpose: 'Arguments',       judge: 'Justice Devendra Kumar Upadhyaya', next_date: '2023-11-05' },
      { hearing_date: '2023-11-05', purpose: 'Final Disposal',  judge: 'Justice Devendra Kumar Upadhyaya', next_date: null },
    ],
  },
];

const MOCK_JUDGMENTS: Judgment[] = [
  {
    cnr: 'ESCR2024001289',
    title: 'State of Karnataka v. Gopalakrishna & Ors.',
    petitioner: 'State of Karnataka',
    respondent: 'Gopalakrishna & Ors.',
    judge: ['Justice D.Y. Chandrachud', 'Justice J.B. Pardiwala'],
    author_judge: 'Justice D.Y. Chandrachud',
    decision_date: '2024-04-18',
    court: MOCK_COURTS[0],
    case_type: 'Criminal Appeal',
    disposal_nature: 'Allowed',
    citation: '(2024) 4 SCR 112',
    neutral_citation: '2024 INSC 294',
    available_languages: ['English', 'Kannada', 'Hindi'],
    source: 'ARCHIVE',
    pdf_url: '#',
  },
  {
    cnr: 'DLHC020088992023',
    title: 'Association for Democratic Reforms v. Election Commission of India',
    petitioner: 'Association for Democratic Reforms',
    respondent: 'Election Commission of India',
    judge: ['Justice Manmohan', 'Justice Mini Pushkarna'],
    author_judge: 'Justice Manmohan',
    decision_date: '2023-12-05',
    court: MOCK_COURTS[1],
    case_type: 'Writ Petition (Civil)',
    disposal_nature: 'Dismissed',
    citation: '2023 DHC 8892',
    neutral_citation: '2023:DHC:8892-DB',
    available_languages: ['English'],
    source: 'LIVE_PORTAL',
    pdf_url: '#',
  },
];

const MOCK_ADVOCATES: Advocate[] = [
  {
    id: 'sandeep-g-mehta-dl',
    canonical_name: 'Sandeep G. Mehta',
    name_variants: ['Sandeep Mehta', 'S. G. Mehta'],
    courts: [
      { court_id: 'delhi-hc', court_name: 'Delhi High Court',      case_count: 142, total_cases: 142, pending_cases: 35, disposed_cases: 107, first_seen: '2016-04-12', last_seen: '2026-05-28' },
      { court_id: 'sci',      court_name: 'Supreme Court of India', case_count: 24,  total_cases: 24,  pending_cases: 7,  disposed_cases: 17,  first_seen: '2019-02-08', last_seen: '2026-03-15' },
    ],
    total_cases: 166, pending_cases: 42, disposed_cases: 124,
    specializations: { 'Writ Petition (Civil)': 78, 'Criminal Appeal': 45, 'Civil Appeal': 43 },
    states: { DL: 166 },
    first_seen: '2016-04-12', last_seen: '2026-05-28',
  },
  {
    id: 'p-b-shinde-mh',
    canonical_name: 'Prakash B. Shinde',
    name_variants: ['P. B. Shinde', 'Prakash Shinde'],
    courts: [
      { court_id: 'bombay-hc',      court_name: 'Bombay High Court',   case_count: 215, total_cases: 215, pending_cases: 80, disposed_cases: 135, first_seen: '2012-09-01', last_seen: '2026-06-01' },
      { court_id: 'dc-mh-pune-001', court_name: 'Pune District Court', case_count: 310, total_cases: 310, pending_cases: 105, disposed_cases: 205, first_seen: '2013-03-15', last_seen: '2026-05-20' },
    ],
    total_cases: 525, pending_cases: 185, disposed_cases: 340,
    specializations: { 'Miscellaneous Application': 200, 'Bail Application': 180, 'Civil Suit': 145 },
    states: { MH: 525 },
    first_seen: '2012-09-01', last_seen: '2026-06-01',
  },
];

const MOCK_JUDGES: Judge[] = [
  {
    id: 'dy-chandrachud-sci',
    canonical_name: 'Justice D.Y. Chandrachud',
    name_variants: ['D.Y. Chandrachud', 'Dhananjaya Y. Chandrachud', 'Justice Chandrachud'],
    designation: 'Chief Justice of India',
    courts: [
      { court_id: 'sci',       court_name: 'Supreme Court of India', start_date: '2016-05-13', tenure_start: '2016-05-13', tenure_end: null,          total_judgments: 890, authored: 380, presided: 510 },
      { court_id: 'bombay-hc', court_name: 'Bombay High Court',      start_date: '2000-03-29', tenure_start: '2000-03-29', end_date: '2013-10-31', tenure_end: '2013-10-31', total_judgments: 355, authored: 132, presided: 223 },
    ],
    total_judgments: 1245, authored: 512, presided: 733,
    disposal_breakdown:   { Allowed: 580, Dismissed: 490, 'Partly Allowed': 175 },
    case_type_breakdown:  { 'Constitutional Matter': 180, 'Criminal Appeal': 450, 'Civil Appeal': 615 },
    is_active: true, tenure_start: '2000-03-29', tenure_end: null,
  },
  {
    id: 'rajiv-shakdher-dlhc',
    canonical_name: 'Justice Rajiv Shakdher',
    name_variants: ['Rajiv Shakdher', 'Justice Shakdher'],
    designation: 'Judge',
    courts: [{ court_id: 'delhi-hc', court_name: 'Delhi High Court', start_date: '2008-04-11', tenure_start: '2008-04-11', tenure_end: null, total_judgments: 814, authored: 390, presided: 424 }],
    total_judgments: 814, authored: 390, presided: 424,
    disposal_breakdown:  { Allowed: 320, Dismissed: 380, 'Partly Allowed': 114 },
    case_type_breakdown: { 'Writ Petition (Civil)': 410, 'Company Petition': 204, 'Taxation Matter': 200 },
    is_active: true, tenure_start: '2008-04-11', tenure_end: null,
  },
];

const MOCK_BULK_JOBS: BulkJob[] = [
  { job_id: 'job-99824', status: 'COMPLETED', court_id: 'delhi-hc',  year: 2024, progress: 100,  records_processed: 4500, records_total: 4500, download_url: '#', created_at: '2026-05-30T10:00:00Z' },
  { job_id: 'job-99825', status: 'RUNNING',   court_id: 'bombay-hc', year: 2025, progress: 68.5, records_processed: 3120, records_total: 4550, download_url: null, created_at: '2026-06-02T14:30:00Z' },
];

const MOCK_REVIEWS: ResolutionReviewItem[] = [
  { id: 'rev-001', entity_type: 'ADVOCATE', name_a: 'S. G. Mehta',          name_b: 'Sandeep G. Mehta',          similarity_score: 92, details: { court_a: 'sci',       court_b: 'delhi-hc', cases_a: 5,   cases_b: 142 } },
  { id: 'rev-002', entity_type: 'JUDGE',    name_a: 'Justice Chandrachud',   name_b: 'Justice D.Y. Chandrachud',  similarity_score: 96, details: { court_a: 'bombay-hc', court_b: 'sci',      cases_a: 12,  cases_b: 512 } },
];

const MOCK_SEEDS: SeedStatus[] = [
  { job: 'seed_s3_hc_judges',     status: 'completed', year_current: 2024, year_total: 2024, records_added: 1840223 },
  { job: 'seed_s3_hc_advocates',  status: 'running',   year_current: 2022, year_total: 2024, records_added: 890412  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => [k, String(v)] as [string, string]);
  return new URLSearchParams(entries).toString();
}

// ── API service ───────────────────────────────────────────────────────────────

export const apiService = {

  // ── Courts ──────────────────────────────────────────────────────────────────

  async getCourts(): Promise<Court[]> {
    if (apiConfig.useMock) { await sleep(400); return MOCK_COURTS; }
    const data = await request<Record<string, unknown>[]>('/v1/courts');
    return data.map(normaliseCourt);
  },

  async getStates(): Promise<{ code: string; name: string }[]> {
    if (apiConfig.useMock) {
      await sleep(200);
      return [
        { code: 'DL', name: 'Delhi' },
        { code: 'MH', name: 'Maharashtra' },
        { code: 'KA', name: 'Karnataka' },
        { code: 'TN', name: 'Tamil Nadu' },
      ];
    }
    return request<{ code: string; name: string }[]>('/v1/courts/states');
  },

  async getDistricts(state: string): Promise<{ code: string; name: string }[]> {
    if (apiConfig.useMock) {
      await sleep(250);
      if (state === 'MH') return [{ code: 'pune', name: 'Pune' }, { code: 'mumbai', name: 'Mumbai' }];
      return [{ code: 'new_delhi', name: 'New Delhi' }];
    }
    // Backend returns { state_code, districts: [{ code, name }] }
    // District names may contain HTML residue from scraping e.g. "Pune<\/option>"
    const data = await request<{ state_code: string; districts: { code: string; name: string }[] }>(
      `/v1/courts/states/${state}/districts`
    );
    return data.districts.map(d => ({ code: d.code, name: stripHtml(d.name) }));
  },

  async getComplexes(state: string, district: string): Promise<{ code: string; name: string }[]> {
    if (apiConfig.useMock) {
      await sleep(200);
      return [{ code: 'complex_1', name: 'Court Complex A' }, { code: 'complex_2', name: 'Court Complex B' }];
    }
    // Backend returns { state_code, district_code, complexes: [{code, name, est_code, flag}] }
    const data = await request<{ state_code: string; district_code: string; complexes: { code: string; name: string }[] }>(
      `/v1/courts/states/${state}/districts/${district}/complexes`
    );
    return (data.complexes || []).map(c => ({ code: c.code, name: stripHtml(c.name) }));
  },

  async getCaseTypes(state: string, district: string, complex: string): Promise<{ code: string; name: string }[]> {
    if (apiConfig.useMock) {
      await sleep(200);
      return [
        { code: 'WP', name: 'Writ Petition' },
        { code: 'CS', name: 'Civil Suit' },
        { code: 'CRL', name: 'Criminal Case' },
      ];
    }
    const data = await request<{ case_types: { code: string; case_type: string; name: string }[] }>(
      `/v1/courts/states/${state}/districts/${district}/complexes/${encodeURIComponent(complex)}/case-types`
    );
    return (data.case_types || []).map(t => ({ code: t.code, name: t.name }));
  },

  // ── Cases ────────────────────────────────────────────────────────────────────

  async searchCases(params: {
    cnr?: string; court?: string; party?: string; advocate?: string;
    case_no?: string; case_type?: string; year?: number;
    year_from?: number; year_to?: number;
    fir_no?: string; police_station?: string;
    filing_no?: string; filing_year?: number;
  }): Promise<CaseInfo[]> {
    if (apiConfig.useMock) {
      await sleep(600);
      return MOCK_CASES.filter(c => {
        if (params.cnr       && !c.cnr.toLowerCase().includes(params.cnr.toLowerCase())) return false;
        if (params.court     && c.court.id !== params.court) return false;
        if (params.party     && !c.petitioner.toLowerCase().includes(params.party.toLowerCase()) && !c.respondent.toLowerCase().includes(params.party.toLowerCase())) return false;
        if (params.advocate  && !c.advocate_petitioner.toLowerCase().includes(params.advocate.toLowerCase()) && !c.advocate_respondent.toLowerCase().includes(params.advocate.toLowerCase())) return false;
        if (params.case_no   && !c.case_number.toLowerCase().includes(params.case_no.toLowerCase())) return false;
        if (params.case_type && !c.case_type.toLowerCase().includes(params.case_type.toLowerCase())) return false;
        return true;
      });
    }
    const query = buildQuery(params);
    // Backend may return { items, ... } (paginated) or a single object depending on phase
    const data = await request<CaseInfo | { items: CaseInfo[] } | null>(`/v1/cases?${query}`);
    if (!data) return [];
    if ('items' in data) return data.items;
    return [data];
  },

  async getCaseByCnr(cnr: string): Promise<CaseInfo | null> {
    if (apiConfig.useMock) { await sleep(400); return MOCK_CASES.find(c => c.cnr === cnr) ?? null; }
    return request<CaseInfo>(`/v1/cases/${cnr}`);
  },

  // ── Judgments ────────────────────────────────────────────────────────────────

  async searchJudgments(
    params: { judge?: string; year?: number; court?: string; text?: string; cnr?: string },
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResult<Judgment>> {
    if (apiConfig.useMock) {
      await sleep(700);
      const filtered = MOCK_JUDGMENTS.filter(j => {
        if (params.cnr    && j.cnr !== params.cnr) return false;
        if (params.judge  && !j.judge.some(n => n.toLowerCase().includes(params.judge!.toLowerCase()))) return false;
        if (params.year   && !j.decision_date.startsWith(params.year.toString())) return false;
        if (params.court  && j.court.id !== params.court) return false;
        if (params.text   && !j.title.toLowerCase().includes(params.text.toLowerCase()) && !j.petitioner.toLowerCase().includes(params.text.toLowerCase())) return false;
        return true;
      });
      const start = (page - 1) * pageSize;
      return {
        items: filtered.slice(start, start + pageSize),
        total: filtered.length,
        page,
        page_size: pageSize,
        total_pages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      };
    }
    // Backend returns paginated: { items: Judgment[], total, page, page_size, total_pages }
    const query = buildQuery({ ...(params as Record<string, string | number | undefined>), page, page_size: pageSize });
    const data = await request<{ items: Record<string, unknown>[]; total: number; page: number; page_size: number; total_pages?: number }>(
      `/v1/judgments?${query}`
    );
    const ps = data.page_size || pageSize;
    const total = data.total ?? data.items.length;
    return {
      items: data.items.map(normaliseJudgment),
      total,
      page: data.page ?? page,
      page_size: ps,
      total_pages: data.total_pages ?? Math.max(1, Math.ceil(total / ps)),
    };
  },

  async getJudgmentByCnr(cnr: string): Promise<Judgment | null> {
    if (apiConfig.useMock) { await sleep(400); return MOCK_JUDGMENTS.find(j => j.cnr === cnr) ?? null; }
    const raw = await request<Record<string, unknown>>(`/v1/judgments/${cnr}`);
    return raw ? normaliseJudgment(raw) : null;
  },

  // ── Cause lists ───────────────────────────────────────────────────────────────

  async getCauseList(court: string, date: string): Promise<CauseListResponse> {
    if (apiConfig.useMock) {
      await sleep(500);
      const mockEntries: CauseListEntry[] = [
        {
          serial_number: 1, case_number: 'WP(C) 1245/2024', case_type: 'Writ Petition (Civil)',
          petitioner: 'M/S TechCorp Solutions Pvt Ltd', respondent: 'Union of India',
          advocate_petitioner: 'Sandeep G. Mehta', advocate_respondent: 'Anjali Sharma',
          judge: 'Justice Rajiv Shakdher', bench: 'Division Bench II',
          court: MOCK_COURTS[1], listing_date: date,
        },
        {
          serial_number: 2, case_number: 'Crl.A. 89/2023', case_type: 'Criminal Appeal',
          petitioner: 'Karan Johar', respondent: 'State of Delhi',
          advocate_petitioner: 'Devendra Malik', advocate_respondent: 'S. K. Rungta',
          judge: 'Justice Rajiv Shakdher', bench: 'Division Bench II',
          court: MOCK_COURTS[1], listing_date: date,
        },
      ];
      return {
        court_id: court, court_name: MOCK_COURTS.find(c => c.id === court)?.name ?? court,
        listing_date: date, format: 'entries',
        entries: mockEntries, pdf_url: null, bench_code: null, bench_name: 'Delhi', total_cases: 2,
      };
    }

    // Backend returns the unified CauseListResponse shape regardless of court tier.
    const data = await request<{
      court_id: string;
      court_name: string;
      listing_date: string;
      format: 'pdf' | 'entries';
      entries: CauseListEntry[];
      pdf_url: string | null;
      bench_code: string | null;
      bench_name: string | null;
      total_cases: number | null;
    }>(`/v1/cause-lists/${court}/${date}`);

    return {
      court_id:    data.court_id,
      court_name:  data.court_name,
      listing_date: data.listing_date,
      format:      data.format,
      entries:     data.entries ?? [],
      pdf_url:     data.pdf_url ?? null,
      bench_code:  data.bench_code ?? null,
      bench_name:  data.bench_name ?? null,
      total_cases: data.total_cases ?? null,
    };
  },

  // ── Advocates ─────────────────────────────────────────────────────────────────

  async searchAdvocates(
    params: { name?: string; state?: string; court?: string },
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResult<Advocate>> {
    if (apiConfig.useMock) {
      await sleep(500);
      // Cut-off: 3 years ago (mirrors the backend active_only=true window)
      const cutoffYear = new Date().getFullYear() - 3;
      const filtered = MOCK_ADVOCATES.filter(a => {
        // Exclude retired advocates (last seen more than 3 years ago)
        if (a.last_seen && parseInt(a.last_seen.slice(0, 4)) < cutoffYear) return false;
        if (params.name  && !a.canonical_name.toLowerCase().includes(params.name.toLowerCase())) return false;
        if (params.state && !a.states[params.state]) return false;
        if (params.court && !a.courts.some(c => c.court_id === params.court)) return false;
        return true;
      });
      const start = (page - 1) * pageSize;
      return {
        items: filtered.slice(start, start + pageSize),
        total: filtered.length,
        page,
        page_size: pageSize,
        total_pages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      };
    }
    // Backend returns paginated: { items: Advocate[], total, page, page_size }
    // active_only=true is the backend default — retired advocates excluded from all listings.
    const query = buildQuery({ ...params, active_only: true, page, page_size: pageSize });
    const data = await request<{ items: Advocate[]; total: number; page: number; page_size: number; total_pages?: number }>(
      `/v1/advocates?${query}`
    );
    const ps = data.page_size || pageSize;
    const items = (data.items ?? []).map(normaliseAdvocate);
    const total = data.total ?? items.length;
    return {
      items,
      total,
      page: data.page ?? page,
      page_size: ps,
      total_pages: data.total_pages ?? Math.max(1, Math.ceil(total / ps)),
    };
  },

  async getAdvocateById(id: string): Promise<Advocate | null> {
    if (apiConfig.useMock) { await sleep(400); return MOCK_ADVOCATES.find(a => a.id === id) ?? null; }
    const data = await request<Advocate>(`/v1/advocates/${id}`);
    if (!data) return null;
    return normaliseAdvocate(data);
  },

  async getAdvocateCases(id: string): Promise<CaseInfo[]> {
    if (apiConfig.useMock) {
      await sleep(400);
      const advocate = MOCK_ADVOCATES.find(a => a.id === id);
      if (!advocate) return [];
      return MOCK_CASES.filter(c =>
        c.advocate_petitioner.toLowerCase().includes(advocate.canonical_name.toLowerCase()) ||
        c.advocate_respondent.toLowerCase().includes(advocate.canonical_name.toLowerCase())
      );
    }
    const data = await request<CaseInfo[] | { items: CaseInfo[] }>(`/v1/advocates/${id}/cases`);
    return Array.isArray(data) ? data : data.items;
  },

  async claimAdvocateProfile(id: string, details: { bar_registration_number: string; phone: string; email: string }): Promise<{ success: boolean; claim_id: string }> {
    if (apiConfig.useMock) {
      await sleep(600);
      return { success: true, claim_id: `claim-${Math.floor(Math.random() * 90000) + 10000}` };
    }
    return request<{ success: boolean; claim_id: string }>(`/v1/advocates/${id}/claim`, {
      method: 'POST',
      body: JSON.stringify(details),
    });
  },

  // ── Judges ────────────────────────────────────────────────────────────────────

  async searchJudges(
    params: { name?: string; court?: string },
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResult<Judge>> {
    if (apiConfig.useMock) {
      await sleep(500);
      // Only show active judges — mirrors the backend is_active=true default.
      const filtered = MOCK_JUDGES.filter(j => {
        if (!j.is_active) return false;
        if (params.name  && !j.canonical_name.toLowerCase().includes(params.name.toLowerCase())) return false;
        if (params.court && !j.courts.some(c => c.court_id === params.court)) return false;
        return true;
      });
      const start = (page - 1) * pageSize;
      return {
        items: filtered.slice(start, start + pageSize),
        total: filtered.length,
        page,
        page_size: pageSize,
        total_pages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      };
    }
    // Backend returns paginated: { items: Judge[], total, page, page_size }
    // is_active=true filters out retired judges — enforced explicitly here and as
    // the backend router default so retired judges never appear in any listing.
    const query = buildQuery({
      ...(params as Record<string, string | undefined>),
      is_active: true,
      page,
      page_size: pageSize,
    });
    const data = await request<{ items: Judge[]; total: number; page: number; page_size: number; total_pages?: number }>(
      `/v1/judges?${query}`
    );
    const ps = data.page_size || pageSize;
    const total = data.total ?? data.items.length;
    return {
      items: data.items.map(normaliseJudge),
      total,
      page: data.page ?? page,
      page_size: ps,
      total_pages: data.total_pages ?? Math.max(1, Math.ceil(total / ps)),
    };
  },

  async getJudgeById(id: string): Promise<Judge | null> {
    if (apiConfig.useMock) { await sleep(400); return MOCK_JUDGES.find(j => j.id === id) ?? null; }
    const data = await request<Judge>(`/v1/judges/${id}`);
    return data ? normaliseJudge(data) : null;
  },

  async getJudgeJudgments(id: string): Promise<Judgment[]> {
    if (apiConfig.useMock) {
      await sleep(400);
      const judge = MOCK_JUDGES.find(j => j.id === id);
      if (!judge) return [];
      return MOCK_JUDGMENTS.filter(j => j.judge.includes(judge.canonical_name));
    }
    const data = await request<Judgment[] | { items: Judgment[] }>(`/v1/judges/${id}/judgments`);
    return Array.isArray(data) ? data : data.items;
  },

  // ── Calcutta High Court ───────────────────────────────────────────────────────

  async searchCalcuttaOrders(params: {
    case_type: string;
    case_number: string;
    year: string;
    establishment?: string;
  }): Promise<CalcuttaResult> {
    if (apiConfig.useMock) {
      await sleep(700);
      return {
        case: {
          cnr: `CAL${params.year}${params.case_number.padStart(6, '0')}`,
          case_number: `${params.case_type}/${params.case_number}/${params.year}`,
          case_type: params.case_type,
          registration_date: `${params.year}-01-10`,
          petitioner: 'Sample Petitioner Pvt Ltd',
          respondent: 'State of West Bengal',
          advocate_petitioner: 'A. K. Banerjee',
          advocate_respondent: 'D. Ghosh (Govt. Pleader)',
          judges: ['Justice Harish Tandon', 'Justice Hiranmay Bhattacharyya'],
          status: 'PENDING',
          next_hearing_date: '2026-07-15',
          court: { id: 'calcutta-hc', court_type: 'HIGH', name: 'Calcutta High Court', state_code: 'WB', portal_url: 'calcuttahighcourt.gov.in' },
          orders: [],
        },
        orders: [
          { order_date: `${params.year}-03-12`, order_type: 'Interim Order', judge: 'Justice Harish Tandon', pdf_url: '#', neutral_citation: null },
          { order_date: `${params.year}-05-28`, order_type: 'Hearing', judge: 'Justice Harish Tandon', pdf_url: '#', neutral_citation: null },
        ],
        total: 2,
      };
    }
    const query = buildQuery({ ...params, establishment: params.establishment ?? 'appellate' });
    return request<CalcuttaResult>(`/v1/calcutta/orders?${query}`);
  },

  async downloadCalcuttaPdf(pdfUrl: string): Promise<void> {
    // Proxy through the backend so CORS headers are added
    const query = buildQuery({ pdf_url: pdfUrl });
    const url = `${apiConfig.baseUrl}/v1/calcutta/pdf?${query}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  // ── Bulk jobs ─────────────────────────────────────────────────────────────────

  async getBulkJobs(): Promise<BulkJob[]> {
    if (apiConfig.useMock) { await sleep(300); return MOCK_BULK_JOBS; }
    // Backend currently returns a single mock job object; Phase 9 will return an array.
    // Handle both shapes defensively.
    const raw = await request<Record<string, unknown> | Record<string, unknown>[] | { items: Record<string, unknown>[] }>(
      '/v1/bulk/jobs'
    );
    if (Array.isArray(raw)) return raw.map(normaliseBulkJob);
    if (raw && 'items' in raw && Array.isArray((raw as { items: unknown[] }).items)) {
      return (raw as { items: Record<string, unknown>[] }).items.map(normaliseBulkJob);
    }
    // Single object fallback (current backend)
    return [normaliseBulkJob(raw as Record<string, unknown>)];
  },

  async startBulkJob(courtId: string, year?: number): Promise<BulkJob> {
    if (apiConfig.useMock) {
      await sleep(500);
      const newJob: BulkJob = {
        job_id: `job-${Math.floor(Math.random() * 90000) + 10000}`,
        status: 'PENDING', court_id: courtId, year,
        progress: 0, records_processed: 0, records_total: 1000,
        download_url: null, created_at: new Date().toISOString(),
      };
      MOCK_BULK_JOBS.push(newJob);
      return newJob;
    }
    const raw = await request<Record<string, unknown>>('/v1/bulk/download', {
      method: 'POST',
      body: JSON.stringify({ court_id: courtId, year }),
    });
    return normaliseBulkJob(raw);
  },

  // ── Admin / operations ────────────────────────────────────────────────────────

  async getSeedStatus(): Promise<SeedStatus[]> {
    if (apiConfig.useMock) { await sleep(300); return MOCK_SEEDS; }
    // Backend returns { items: RawSeedRow[], total, summary: { [job_name]: { years_done, records_added } } }
    // Each item is a per-(job, court, year) row; we aggregate into one SeedStatus per job_name.
    const data = await request<{
      items: { job_name: string; court_id: string | null; year_completed: number | null; records_added: number | null }[];
      summary: Record<string, { years_done: number; records_added: number }>;
    }>('/v1/admin/seed-status');

    const summary = data.summary ?? {};
    // Derive per-job aggregates — if summary is present use it, otherwise tally items.
    const jobMap: Record<string, { records_added: number; years: number[] }> = {};
    for (const row of data.items) {
      const jn = row.job_name;
      if (!jobMap[jn]) jobMap[jn] = { records_added: 0, years: [] };
      jobMap[jn].records_added += row.records_added ?? 0;
      if (row.year_completed != null) jobMap[jn].years.push(row.year_completed);
    }

    // Merge summary totals (more accurate than tallying rows)
    for (const [jn, s] of Object.entries(summary)) {
      if (!jobMap[jn]) jobMap[jn] = { records_added: 0, years: [] };
      jobMap[jn].records_added = s.records_added;
    }

    return Object.entries(jobMap).map(([job, agg]) => {
      const years = agg.years.sort((a, b) => a - b);
      const year_total = years.length > 0 ? years[years.length - 1] : new Date().getFullYear();
      const year_current = years.length > 0 ? years[years.length - 1] : year_total;
      return {
        job,
        status: agg.records_added > 0 ? 'completed' : 'idle',
        year_current,
        year_total,
        records_added: agg.records_added,
      } satisfies SeedStatus;
    });
  },

  async triggerSeedJudges(): Promise<{ queued: boolean; job_id?: string; error?: string }> {
    if (apiConfig.useMock) { await sleep(500); return { queued: true, job_id: 'mock-job-judges' }; }
    return request<{ queued: boolean; job_id?: string; error?: string }>('/v1/admin/seed/judges', { method: 'POST' });
  },

  async triggerSeedAdvocates(): Promise<{ queued: boolean; job_id?: string; error?: string }> {
    if (apiConfig.useMock) { await sleep(500); return { queued: true, job_id: 'mock-job-advocates' }; }
    return request<{ queued: boolean; job_id?: string; error?: string }>('/v1/admin/seed/advocates', { method: 'POST' });
  },

  async triggerSweepDC(): Promise<{ queued: boolean; job_id?: string; error?: string }> {
    if (apiConfig.useMock) { await sleep(500); return { queued: true, job_id: 'mock-job-sweep-dc' }; }
    return request<{ queued: boolean; job_id?: string; error?: string }>('/v1/admin/seed/sweep-dc', { method: 'POST' });
  },

  async getResolutionReview(): Promise<ResolutionReviewItem[]> {
    if (apiConfig.useMock) { await sleep(400); return MOCK_REVIEWS; }
    // Backend returns { items: ResolutionReviewItem[], total, page, page_size }
    const data = await request<{ items: ResolutionReviewItem[] }>('/v1/admin/resolution-review');
    return data.items;
  },

  async mergeResolution(id: string): Promise<boolean> {
    if (apiConfig.useMock) {
      await sleep(400);
      const idx = MOCK_REVIEWS.findIndex(r => r.id === id);
      if (idx !== -1) MOCK_REVIEWS.splice(idx, 1);
      return true;
    }
    await request<unknown>(`/v1/admin/resolution-review/${id}/merge`, { method: 'POST' });
    return true;
  },

  async rejectResolution(id: string): Promise<boolean> {
    if (apiConfig.useMock) {
      await sleep(400);
      const idx = MOCK_REVIEWS.findIndex(r => r.id === id);
      if (idx !== -1) MOCK_REVIEWS.splice(idx, 1);
      return true;
    }
    await request<unknown>(`/v1/admin/resolution-review/${id}/reject`, { method: 'POST' });
    return true;
  },
};

/**
 * Academic Terms — shared utilities
 *
 * Provides types, fetching helpers, and week-label generation
 * for the Kenyan primary school calendar (3 terms per year).
 */

export interface AcademicTerm {
  id: string;
  year: number;
  term: 1 | 2 | 3;
  label: string;
  start_date: string;   // ISO date string "YYYY-MM-DD"
  end_date: string;     // ISO date string "YYYY-MM-DD"
  total_weeks: number;  // computed by DB generated column
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeekOption {
  /** Stored value — e.g. "2025-T2-W3" */
  value: string;
  /** Display label — e.g. "Term 2 · Week 3  (Apr 28 – May 4)" */
  label: string;
  /** Week number within the term (1-based) */
  weekNumber: number;
  /** ISO date of Monday for this week */
  weekStart: string;
  /** ISO date of Sunday for this week */
  weekEnd: string;
  term: AcademicTerm;
}

// ---------------------------------------------------------------------------
// Fetch helpers (client-side, admin API)
// ---------------------------------------------------------------------------

export async function fetchAcademicTerms(): Promise<AcademicTerm[]> {
  const res = await fetch('/api/admin/academic-terms');
  if (!res.ok) throw new Error('Failed to fetch academic terms');
  const data = await res.json();
  return data.terms as AcademicTerm[];
}

// ---------------------------------------------------------------------------
// Week generation
// ---------------------------------------------------------------------------

const DATE_FMT = new Intl.DateTimeFormat('en-KE', {
  month: 'short',
  day: 'numeric',
  timeZone: 'Africa/Nairobi',
});

/**
 * Given a term, returns an array of WeekOption objects — one per week.
 * Week 1 starts on the term's start_date (regardless of day-of-week).
 */
export function getWeekOptions(term: AcademicTerm): WeekOption[] {
  const options: WeekOption[] = [];
  const start = new Date(term.start_date + 'T00:00:00+03:00');

  for (let w = 1; w <= term.total_weeks; w++) {
    const weekStart = new Date(start.getTime() + (w - 1) * 7 * 24 * 3600 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 3600 * 1000);

    const value = `${term.year}-T${term.term}-W${w}`;
    const rangeLabel = `${DATE_FMT.format(weekStart)} – ${DATE_FMT.format(weekEnd)}`;
    const label = `${term.label} · Week ${w}  (${rangeLabel})`;

    options.push({
      value,
      label,
      weekNumber: w,
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      term,
    });
  }

  return options;
}

/**
 * Returns all week options across all provided terms, sorted by date.
 */
export function getAllWeekOptions(terms: AcademicTerm[]): WeekOption[] {
  return terms.flatMap(getWeekOptions).sort((a, b) =>
    a.weekStart.localeCompare(b.weekStart)
  );
}

/**
 * Parses a stored week value like "2025-T2-W3" into its parts.
 * Returns null if the format doesn't match.
 */
export function parseWeekValue(
  value: string
): { year: number; term: number; week: number } | null {
  const m = value.match(/^(\d{4})-T([123])-W(\d+)$/);
  if (!m) return null;
  return { year: Number(m[1]), term: Number(m[2]), week: Number(m[3]) };
}

/**
 * Given a stored week value and a list of terms, returns a human-readable
 * label. Falls back to the raw value if the term isn't found.
 */
export function weekValueToLabel(value: string, terms: AcademicTerm[]): string {
  if (!value) return '—';
  const parsed = parseWeekValue(value);
  if (!parsed) return value; // legacy free-text value — show as-is

  const term = terms.find(
    (t) => t.year === parsed.year && t.term === parsed.term
  );
  if (!term) return value;

  const options = getWeekOptions(term);
  const opt = options.find((o) => o.weekNumber === parsed.week);
  return opt ? opt.label : value;
}

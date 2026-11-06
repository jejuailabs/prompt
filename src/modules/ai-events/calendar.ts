// Calendar view of AI 일정: which event lands on which Korean calendar day.
import { koreaDate, type AiEvent } from './catalogue';

/** `run` = the days an event is held, `start` = first day of a long programme, `deadline` = last day to apply. Days are YYYY-MM-DD (KST). */
export type CalendarEntry = { key: string; event: AiEvent; type: 'run' | 'start' | 'deadline'; from: string; to: string };

const DAY_MS = 86_400_000;
// A months-long course would paint every cell, so anything over a week is marked on its first day only.
const MAX_RUN_DAYS = 7;
const TYPE_ORDER = { run: 0, start: 0, deadline: 1 };

const dayMs = (day: string) => Date.parse(day + 'T00:00:00Z');
const pad = (value: number | string) => String(value).padStart(2, '0');
function validDay(year: string, month: string, date: string) {
  const day = `${year}-${pad(month)}-${pad(date)}`;
  const time = dayMs(day);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === day ? day : null;
}

/**
 * Dates written out in the schedule text ("2026.11.20.~2026.11.22.", "2026.10.06–10.08", "2026.11.12 · 17:00").
 * Auto-collected events only fill startsAt when a clock time is published, so the date often lives here alone.
 */
export function scheduleDays(schedule: string): { from: string; to: string } | null {
  if (schedule.includes('까지')) return null; // an application deadline, already carried by applyUntil
  const match = schedule.match(/(\d{4})\.\s?(\d{1,2})\.\s?(\d{1,2})\.?(?:\s?[~–-]\s?(?:(\d{4})\.\s?)?(\d{1,2})\.\s?(\d{1,2}))?/);
  if (!match) return null;
  const from = validDay(match[1], match[2], match[3]);
  if (!from) return null;
  let to = match[5] ? validDay(match[4] ?? match[1], match[5], match[6]) : null;
  // "2026.12.30–01.02" rolls into the next year.
  if (to && to < from && !match[4]) to = validDay(String(Number(match[1]) + 1), match[5], match[6]);
  return { from, to: to && to >= from ? to : from };
}

function runDays(item: AiEvent) {
  const start = item.startsAt ? Date.parse(item.startsAt) : NaN;
  if (!Number.isFinite(start)) return scheduleDays(item.schedule);
  const end = item.endsAt ? Date.parse(item.endsAt) : NaN;
  const from = koreaDate(new Date(start));
  return { from, to: Number.isFinite(end) && end >= start ? koreaDate(new Date(end)) : from };
}

export function calendarEntries(events: AiEvent[]): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  for (const event of events) {
    const run = runDays(event);
    if (run) {
      const long = dayMs(run.to) - dayMs(run.from) >= MAX_RUN_DAYS * DAY_MS;
      entries.push({ key: event.id + ':run', event, type: long ? 'start' : 'run', from: run.from, to: long ? run.from : run.to });
    }
    // An organizer's early-close notice overrides the original deadline, so that date is no longer a date to act on.
    if (event.applyUntil && !event.registrationClosed) entries.push({ key: event.id + ':deadline', event, type: 'deadline', from: event.applyUntil, to: event.applyUntil });
  }
  return entries.sort((a, b) => a.from.localeCompare(b.from) || TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.event.title.localeCompare(b.event.title, 'ko'));
}

export const entriesOn = (entries: CalendarEntry[], day: string) => entries.filter((entry) => entry.from <= day && day <= entry.to);
export const entriesBetween = (entries: CalendarEntry[], from: string, to: string) => entries.filter((entry) => entry.from <= to && from <= entry.to);
export const daysBetween = (from: string, to: string) => Math.round((dayMs(to) - dayMs(from)) / DAY_MS);
export const weekdayOf = (day: string) => new Date(dayMs(day)).getUTCDay();

/** Sunday-first weeks of a month; cells outside the month are null. `month` is 1–12. */
export function monthWeeks(year: number, month: number): (string | null)[][] {
  const lead = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: count }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`)];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

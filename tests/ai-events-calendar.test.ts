import test from "node:test";
import assert from "node:assert/strict";
import { calendarEntries, entriesBetween, entriesOn, monthWeeks, scheduleDays } from "../src/modules/ai-events/calendar";
import type { AiEvent } from "../src/modules/ai-events/catalogue";

const event = (id: string, fields: Partial<AiEvent>): AiEvent => ({
  id, kind: "course", title: id, posterLines: [], subtitle: "", organizer: "", summary: "", audience: "", location: "", cost: "",
  schedule: "원문 확인", application: "원문 확인", sourceUrl: "https://example.com", verifiedAt: "2026-11-01", tags: [], accent: "", surface: "", motif: "learning", ...fields,
});
const shape = (events: AiEvent[]) => calendarEntries(events).map((entry) => [entry.event.id, entry.type, entry.from, entry.to]);

test("schedule text: single day, short and full ranges", () => {
  assert.deepEqual(scheduleDays("시상식 2026.11.12 · 17:00"), { from: "2026-11-12", to: "2026-11-12" });
  assert.deepEqual(scheduleDays("2026.10.06–10.08 · 마지막 날 16:00 종료"), { from: "2026-10-06", to: "2026-10-08" });
  assert.deepEqual(scheduleDays("2026.11.20.~2026.11.22. · 15:00~19:00(1일차)"), { from: "2026-11-20", to: "2026-11-22" });
  assert.deepEqual(scheduleDays("2026.11.10. ~ 2027.03.31."), { from: "2026-11-10", to: "2027-03-31" });
  assert.deepEqual(scheduleDays("2026.12.30–01.02"), { from: "2026-12-30", to: "2027-01-02" });
});

test("schedule text: a clock range is not a date range, and vague text yields nothing", () => {
  assert.deepEqual(scheduleDays("2026.10.14 · 19:30–21:30"), { from: "2026-10-14", to: "2026-10-14" });
  assert.deepEqual(scheduleDays("2026.11.20. 10:00–2026.11.21. 13:00"), { from: "2026-11-20", to: "2026-11-20" });
  for (const text of ["원문 확인", "상시운영", "2026.10.~11. · 18:30–20:30 (매주 화, 목)", "2026.08.~2026.11. · 과정별 상이", "2026.11.20까지 접수", "2026.02.30"]) assert.equal(scheduleDays(text), null, text);
});

test("entries: structured times win, deadlines are separate, early-closed deadlines are dropped", () => {
  assert.deepEqual(shape([
    event("timed", { startsAt: "2026-11-11T14:00:00+09:00", endsAt: "2026-11-13T18:00:00+09:00", schedule: "2026.11.11 · 14:00–18:00", applyUntil: "2026-11-05" }),
    event("closed", { applyUntil: "2026-10-21", registrationClosed: true }),
    event("undated", {}),
  ]), [["timed", "deadline", "2026-11-05", "2026-11-05"], ["timed", "run", "2026-11-11", "2026-11-13"]]);
});

test("entries: late-night KST start stays on its Korean day; long programmes mark the first day only", () => {
  assert.deepEqual(shape([event("night", { startsAt: "2026-11-30T23:30:00+09:00" })]), [["night", "run", "2026-11-30", "2026-11-30"]]);
  assert.deepEqual(shape([event("term", { schedule: "2026.11.10. ~ 2027.03.31." })]), [["term", "start", "2026-11-10", "2026-11-10"]]);
  assert.deepEqual(shape([event("week", { schedule: "2026.11.02 ~ 2026.11.08" })]), [["week", "run", "2026-11-02", "2026-11-08"]]);
});

test("day and range lookups include multi-day runs", () => {
  const entries = calendarEntries([event("fest", { schedule: "2026.11.04.~2026.11.06." }), event("due", { applyUntil: "2026-11-20" })]);
  assert.deepEqual(entriesOn(entries, "2026-11-05").map((entry) => entry.event.id), ["fest"]);
  assert.deepEqual(entriesOn(entries, "2026-11-07"), []);
  assert.deepEqual(entriesBetween(entries, "2026-11-06", "2026-11-30").map((entry) => entry.event.id), ["fest", "due"]);
  assert.deepEqual(entriesBetween(entries, "2026-11-07", "2026-11-19"), []);
});

test("month grid is Sunday-first and padded to whole weeks", () => {
  const november = monthWeeks(2026, 11);
  assert.equal(november.length, 5);
  assert.deepEqual(november[0], ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"]);
  assert.deepEqual(november[4], ["2026-11-29", "2026-11-30", null, null, null, null, null]);
  const august = monthWeeks(2026, 8);
  assert.equal(august.length, 6);
  assert.deepEqual(august[0].slice(5), [null, "2026-08-01"]);
  assert.equal(monthWeeks(2028, 2).flat().filter(Boolean).length, 29);
});

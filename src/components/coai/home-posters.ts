// Home hero carousel slides, built from AI 일정 so new/auto-collected events show up without code changes.
// Curated photo posters (HOME_PHOTO_POSTERS) keep their artwork when their event is still open.
import { eventStatus, filterEvents, type AiEvent } from '@/modules/ai-events/catalogue';
import { HOME_PHOTO_POSTERS, type HomePhotoPoster } from './home-content';

export type HeroSlide = HomePhotoPoster & {
  /** The organizer's own poster already carries the title, so the headline is only read aloud (not drawn). */
  ownPoster: boolean;
  /** Background for events that have no image at all. */
  surface?: string;
};

const MAX_SLIDES = 8;
const BADGE = { course: '강의', contest: '공모전', event: '행사' } as const;
const CURATED = new Map(HOME_PHOTO_POSTERS.map((poster) => [poster.eventId, poster]));

function slideFor(item: AiEvent, now: Date): HeroSlide {
  const curated = CURATED.get(item.id);
  if (curated) return { ...curated, ownPoster: false };
  const open = eventStatus(item, now).code === 'open';
  return {
    id: item.id, eventId: item.id, kind: item.kind, badge: BADGE[item.kind],
    title: item.posterLines.join('\n') || item.title, when: item.schedule, where: item.location,
    cta: open ? '모집 안내' : '자세히 보기', image: item.posterUrl ?? '', ownPoster: Boolean(item.posterUrl), surface: item.surface,
  };
}

/** Open events first (soonest deadline/start first). Falls back to the curated set if nothing is open. */
export function buildHeroSlides(events: AiEvent[] | undefined, now = new Date()): HeroSlide[] {
  const open = events ? filterEvents(events, { hideClosed: true }, now).slice(0, MAX_SLIDES) : [];
  return open.length ? open.map((item) => slideFor(item, now)) : HOME_PHOTO_POSTERS.map((poster) => ({ ...poster, ownPoster: false }));
}

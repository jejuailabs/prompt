'use client';
import { useAppStore } from '@/lib/store';
import { COAI_SECTIONS, activeCoaiMenu } from '@/lib/coai-navigation';

/** Section tabs for a grouped menu (배우기 · 써보기 · 만들기). 소식 shows news and events on one screen. */
export function StudioSwitcher() {
  const view = useAppStore(s => s.view);
  const params = useAppStore(s => s.params);
  const navigate = useAppStore(s => s.navigate);
  const en = useAppStore(s => s.locale) === 'en';
  const menu = activeCoaiMenu(view, params);
  const sections = menu ? COAI_SECTIONS[menu] : undefined;
  if (!sections) return null;
  return <nav className="coai-make-tabs" aria-label={en ? 'Sections' : '하위 메뉴'}>
    <div className="coai-container">
      {sections.map(section => (
        <button key={section.id} type="button" aria-current={section.current(view, params) ? 'page' : undefined} onClick={() => navigate(section.target.view, section.target.params)}>{en ? section.labelEn : section.label}</button>
      ))}
    </div>
  </nav>;
}

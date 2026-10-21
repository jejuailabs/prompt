'use client';
import { useAppStore } from '@/lib/store';
import { COAI_MAKE_SECTIONS, activeCoaiMenu } from '@/lib/coai-navigation';

/** Section tabs for 만들어보기, which groups several screens. 뉴스·이벤트 shows news and events on one screen. */
export function StudioSwitcher() {
  const view = useAppStore(s => s.view);
  const slug = useAppStore(s => s.params.slug);
  const navigate = useAppStore(s => s.navigate);
  const en = useAppStore(s => s.locale) === 'en';
  const music = view === 'tool' && slug === 'ace-music';
  const menu = music ? 'make' : activeCoaiMenu(view);
  const sections = menu === 'make' ? COAI_MAKE_SECTIONS : null;
  if (!sections) return null;
  return <nav className="coai-make-tabs" aria-label={en ? 'Sections' : '하위 메뉴'}>
    <div className="coai-container">
      {sections.map(section => {
        const current = section.id === 'music' ? music : section.views.includes(view);
        return <button key={section.id} type="button" aria-current={current ? 'page' : undefined} onClick={() => navigate(section.target.view, section.target.params)}>{en ? section.labelEn : section.label}</button>;
      })}
    </div>
  </nav>;
}

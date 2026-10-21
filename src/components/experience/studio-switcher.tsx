'use client';
import { useAppStore } from '@/lib/store';
import { COAI_MAKE_SECTIONS, activeCoaiMenu } from '@/lib/coai-navigation';

/** 만들어보기 section tabs: games, web, motion and the creative studios live under one menu. */
export function StudioSwitcher() {
  const view = useAppStore(s => s.view);
  const slug = useAppStore(s => s.params.slug);
  const navigate = useAppStore(s => s.navigate);
  const en = useAppStore(s => s.locale) === 'en';
  const music = view === 'tool' && slug === 'ace-music';
  if (activeCoaiMenu(view) !== 'make' && !music) return null;
  return <nav className="coai-make-tabs" aria-label={en ? 'Make sections' : '만들어보기 메뉴'}>
    <div className="coai-container">
      {COAI_MAKE_SECTIONS.map(section => {
        const current = section.id === 'music' ? music : section.views.includes(view);
        return <button key={section.id} type="button" aria-current={current ? 'page' : undefined} onClick={() => navigate(section.target.view, section.target.params)}>{en ? section.labelEn : section.label}</button>;
      })}
    </div>
  </nav>;
}

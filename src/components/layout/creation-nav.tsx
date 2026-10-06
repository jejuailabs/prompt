'use client';

import { useModules } from '@/hooks/use-session';
import { spaceEntries } from '@/lib/site-navigation';
import { useAppStore } from '@/lib/store';

export function CreationNav() {
  const { data: modules = [] } = useModules();
  const view = useAppStore(s => s.view);
  const slug = useAppStore(s => s.params.slug);
  const entries = spaceEntries(modules).filter(m => m.quick).sort((a, b) => a.quick!.order - b.quick!.order);
  return <nav className="app-creation-nav" aria-label="제작 바로가기">
    <span>CREATE WITH PLAYLAB</span>
    <div>{entries.map(m => <a key={m.id} href={m.href} aria-current={(m.id === 'tool-ace-music' ? view === 'tool' && slug === 'ace-music' : view === m.entryView) ? 'page' : undefined}>{m.quick!.label}</a>)}</div>
  </nav>;
}

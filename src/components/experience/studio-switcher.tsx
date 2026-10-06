'use client';
import { useModules } from '@/hooks/use-session';
import { useAppStore } from '@/lib/store';
import type { ViewKey } from '@/lib/types';

export function StudioSwitcher() {
  const view = useAppStore(s => s.view);
  const slug = useAppStore(s => s.params.slug);
  const navigate = useAppStore(s => s.navigate);
  const en = useAppStore(s => s.locale) === 'en';
  const { data: modules = [] } = useModules();
  if (!['lab', 'video-studio', '3d-studio'].includes(view) && !(view === 'tool' && slug === 'ace-music')) return null;
  const targets = modules.filter(m => ['model-lab', 'video-studio', '3d-studio', 'tool-ace-music'].includes(m.id));
  return <nav className="studio-switcher" aria-label={en ? 'Creative labs' : '실험실 선택'}><span>THE EXPERIMENT ROOM</span>{targets.map(m => <button key={m.id} aria-current={(m.id === 'tool-ace-music' ? slug === 'ace-music' : view === m.entryView) ? 'page' : undefined} onClick={() => m.id === 'tool-ace-music' ? navigate('tool', { slug: 'ace-music' }) : navigate(m.entryView as ViewKey)}>{({ 'model-lab': en ? 'Image' : '이미지', 'video-studio': en ? 'Video' : '영상', '3d-studio': '3D', 'tool-ace-music': en ? 'Music' : '음악' } as Record<string,string>)[m.id]}</button>)}</nav>;
}

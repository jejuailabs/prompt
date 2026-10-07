'use client';

import { ArrowUpRight } from 'lucide-react';
import { LITTLE_WORLDS } from '@/lib/little-worlds';
import { useAppStore } from '@/lib/store';

export function LittleWorldsShelf({ games }: { games: Array<{ id: string; contentUrl: string | null; topPlayers?:Array<{rank:number;username:string;score:number}> }> }) {
  const navigate = useAppStore((state) => state.navigate);
  return (
    <section className="rounded-lg border border-border bg-card p-5 text-foreground sm:p-7" aria-labelledby="little-worlds-heading">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-[.22em] text-primary">LITTLE WORLDS · ONE ROUND, ONE RECORD</p>
          <h2 id="little-worlds-heading" className="font-serif text-3xl tracking-tight sm:text-4xl">A little play. A lovely day.</h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">복잡한 하루에, 단순한 즐거움. 한 판마다 새로운 선택, 조금 더 높은 최고 기록.</p>
        </div>
        <a href="/games/little-worlds.html" className="flex items-center gap-1 text-xs text-primary hover:underline">컬렉션 둘러보기 <ArrowUpRight className="h-3.5 w-3.5" /></a>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LITTLE_WORLDS.map((item, index) => (
          <button key={item.slug} type="button" onClick={() => navigate('game-play', { id: games.find((game) => game.contentUrl === item.contentUrl)?.id ?? `builtin-${item.slug}` })} className="group overflow-hidden rounded-lg border border-border bg-background text-left transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
              <img src={item.fileUrl} alt={`${item.title} 플레이 화면`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <span className="absolute left-3 top-3 rounded border border-white/20 bg-black/75 px-2.5 py-1 text-[9px] tracking-wider text-white">0{index + 1} / {item.tags[0]}</span>
            </div>
            <div className="p-4">
              <h3 className="font-serif text-2xl">{item.englishTitle}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{item.title}</p>
              {games.find(game=>game.contentUrl===item.contentUrl)?.topPlayers?.length ? <div className="mt-3 space-y-1 border-t border-border pt-3" aria-label={item.title+' 최고 기록'}>{games.find(game=>game.contentUrl===item.contentUrl)?.topPlayers?.map(player=><div key={player.rank} className="flex items-center gap-2 text-[10px]"><span className="w-3 font-mono tabular-nums text-amber-300">{player.rank}</span><span className="min-w-0 flex-1 truncate text-muted-foreground">{player.username}</span><strong className="font-mono tabular-nums">{player.score.toLocaleString()}점</strong></div>)}</div>:<p className="mt-3 text-[10px] text-muted-foreground">첫 숫자 기록의 주인공이 되어보세요.</p>}
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[10px] text-muted-foreground">
                <span>{item.playHint}</span><ArrowUpRight className="h-4 w-4 text-primary" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

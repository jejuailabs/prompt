'use client';

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import {
  AlertTriangle, ArrowRight, ArrowUp, ChevronDown, BookOpen, Check, CircleCheck, Clock, Code, Database, Download, ExternalLink, Flame, FolderGit2,
  GitBranch, Github, Hexagon, KeyRound, Lightbulb, MessageCircle, Orbit, Rocket, Sparkles, SquareTerminal, Triangle, UserCheck,
  type LucideProps,
} from 'lucide-react';
import { ViewHeader } from '@/components/shared/view-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { COLUMNS, PS_ALL, getItems, type ColumnId, type DbChoice, type GuideItem } from './data';
import { MANUAL_PATH, getManualDocs, manualSlug } from './manual';
import { ManualFullCollapsible } from './manual-content';
import { MotionGuide } from './motion-guide';
import { CommandBlock, EnvVarsWidget, GitIdentityWidget, PsSetupWidget, RepoCommandsWidget, useStored } from './widgets';

const ICONS: Record<string, ComponentType<LucideProps>> = {
  'git-branch': GitBranch, hexagon: Hexagon, code: Code, terminal: SquareTerminal, 'user-check': UserCheck,
  sparkles: Sparkles, 'message-circle': MessageCircle, orbit: Orbit, github: Github, triangle: Triangle,
  flame: Flame, database: Database, 'folder-git': FolderGit2, key: KeyRound, rocket: Rocket,
};

const COLUMN_TONE: Record<ColumnId, string> = {
  pc: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  ai: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  account: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  project: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

function ItemIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICONS[name] ?? Sparkles;
  return <Cmp className={cn('size-4 shrink-0', className)} aria-hidden />;
}

export default function VibeSetupView() {
  const [db, setDb] = useStored<DbChoice>('vibe-setup:db', 'firebase');
  const [done, setDone] = useStored<string[]>('vibe-setup:done', []);
  const [openStep, setOpenStep] = useState<ColumnId | null>(null);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const items = useMemo(() => getItems(db), [db]);
  const boardRef = useRef<HTMLElement>(null);
  const [boardVisible, setBoardVisible] = useState(true);
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setBoardVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const scrollToId = (id: string) => window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  const toTop = () => scrollToId('vibe-top');

  // AI 도구는 하나 이상만 설치하면 되므로 진행률에선 1칸으로 계산
  const required = items.filter((i) => i.column !== 'ai');
  const aiDone = items.some((i) => i.column === 'ai' && done.includes(i.id));
  const total = required.length + 1;
  const completed = required.filter((i) => done.includes(i.id)).length + (aiDone ? 1 : 0);
  const nextItem = items.find((i) => !done.includes(i.id) && !(i.column === 'ai' && aiDone));

  const toggleDone = (id: string) => setDone(done.includes(id) ? done.filter((d) => d !== id) : [...done, id]);
  const toggleStep = (col: ColumnId) => {
    if (openStep === col) { setOpenStep(null); return; }
    setOpenStep(col);
    setOpenItem(null);
    scrollToId('step-panel');
  };
  const openGuide = (id: string) => {
    const it = items.find((i) => i.id === id);
    if (!it) return;
    setOpenStep(it.column);
    setOpenItem(id);
    scrollToId('item-detail');
  };

  const step = COLUMNS.find((c) => c.id === openStep);
  const stepItems = step ? items.filter((i) => i.column === step.id) : [];
  const current = stepItems.find((i) => i.id === openItem) ?? null;

  return (
    <div id="vibe-top" className="mx-auto w-full max-w-7xl scroll-mt-20 p-4 md:p-6 lg:p-8">
      <ViewHeader
        title="바이브코딩 시작하기"
        subtitle="1단계부터 차례대로 한 번씩만 따라 하면, 누구나 첫 서비스를 인터넷에 올릴 수 있어요."
      />

      {/* progress + db choice */}
      <div className="mb-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center justify-between gap-2 text-sm">
            <span className="font-semibold">내 진행률</span>
            <span className="tabular-nums text-muted-foreground">{completed} / {total} 완료</span>
          </div>
          <Progress value={(completed / total) * 100} />
          {nextItem ? (
            <Button size="sm" className="mt-3 gap-1" onClick={() => openGuide(nextItem.id)}>
              다음 할 일: {nextItem.title}<ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <p className="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">🎉 준비 끝! 이제 AI 도구에게 만들고 싶은 것을 말해보세요.</p>
          )}
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 text-sm font-semibold">DB · 로그인 서비스</div>
          <div role="radiogroup" aria-label="DB 서비스 선택" className="inline-flex rounded-lg bg-muted p-1">
            {(['firebase', 'supabase'] as const).map((d) => (
              <button
                key={d}
                role="radio"
                aria-checked={db === d}
                onClick={() => setDb(d)}
                className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors', db === d ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                {d === 'firebase' ? <Flame className="size-4" /> : <Database className="size-4" />}
                {d === 'firebase' ? 'Firebase' : 'Supabase'}
              </button>
            ))}
          </div>
          <p className="mt-2 max-w-64 text-[11px] text-muted-foreground">{db === 'firebase' ? '구글 계정으로 바로 시작. NoSQL(문서형) DB' : 'GitHub로 가입. SQL(표 형식) DB, 이 플랫폼도 사용'}</p>
        </div>
      </div>

      {/* 4 big step buttons */}
      <section ref={boardRef} aria-label="4단계" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const colItems = items.filter((i) => i.column === col.id);
          const colDone = colItems.filter((i) => done.includes(i.id)).length;
          const active = openStep === col.id;
          return (
            <button
              key={col.id}
              onClick={() => toggleStep(col.id)}
              aria-expanded={active}
              className={cn('flex flex-col items-start gap-2 rounded-2xl border-2 bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md', active ? 'border-primary shadow-md' : 'border-border')}
            >
              <span className={cn('rounded-full px-3 py-1 text-sm font-bold', COLUMN_TONE[col.id])}>{col.step}단계</span>
              <span className="text-xl font-bold leading-snug">{col.title}</span>
              <span className="text-sm text-muted-foreground">{col.desc}</span>
              <span className="mt-1 flex w-full items-center justify-between text-xs text-muted-foreground">
                <span>항목 {colItems.length}개 · {colDone}개 완료</span>
                <ChevronDown className={cn('size-5 transition-transform', active && 'rotate-180 text-primary')} />
              </span>
            </button>
          );
        })}
      </section>

      {/* opened step: item cards */}
      {step && (
        <section id="step-panel" className="mt-4 scroll-mt-20 rounded-2xl border bg-card p-4 md:p-5">
          <h2 className="mb-3 text-lg font-bold">
            <span className="text-primary">{step.step}단계</span> {step.title}
            <span className="ml-2 text-sm font-normal text-muted-foreground">— 항목을 누르면 자세한 설명이 열려요</span>
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stepItems.map((it, idx) => {
              const isDone = done.includes(it.id);
              const sel = openItem === it.id;
              return (
                <button
                  key={it.id}
                  onClick={() => (sel ? setOpenItem(null) : openGuide(it.id))}
                  className={cn('flex items-start gap-3 rounded-xl border p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/50', sel && 'border-primary bg-primary/5', isDone && !sel && 'border-emerald-500/40 bg-emerald-500/5')}
                >
                  <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', COLUMN_TONE[step.id])}><ItemIcon name={it.icon} className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <span className="text-xs tabular-nums text-muted-foreground">{step.step}-{idx + 1}</span>
                      <span className="truncate">{it.title}</span>
                      {isDone && <CircleCheck className="size-4 shrink-0 text-emerald-500" />}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{it.summary}</span>
                    <span className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5"><Clock className="size-3" />약 {it.minutes}분</span>
                      {it.after && <span className="text-amber-600 dark:text-amber-400">· {it.after}</span>}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {current && (
            <div id="item-detail" className="mt-5 scroll-mt-20 border-t pt-5">
              <div className="mb-4 flex items-center gap-3">
                <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', COLUMN_TONE[step.id])}><ItemIcon name={current.icon} className="size-5" /></span>
                <div className="min-w-0">
                  <h3 className="flex flex-wrap items-center gap-2 text-xl font-bold">
                    {current.title}
                    {done.includes(current.id) && <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">완료</Badge>}
                    {current.after && <Badge variant="outline" className="font-normal">{current.after}</Badge>}
                  </h3>
                  <p className="text-sm text-muted-foreground">{current.summary}</p>
                </div>
              </div>
              <ItemDetail key={current.id} item={current} db={db} done={done.includes(current.id)} onToggleDone={() => toggleDone(current.id)} onTop={() => scrollToId('step-panel')} />
            </div>
          )}
        </section>
      )}

      {!boardVisible && (
        <Button onClick={toTop} className="fixed bottom-20 right-4 z-40 gap-1.5 rounded-full shadow-lg md:bottom-6 md:right-6">
          <ArrowUp className="size-4" />맨 위로
        </Button>
      )}

      <div className="mt-12">
        <ManualFullCollapsible docs={getManualDocs()} />
      </div>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        화면 구성은 2026년 10월 기준으로 단순화해 다시 그린 것이에요. 실제 버튼 이름 · 위치가 조금 다를 수 있으니 공식 매뉴얼 링크도 함께 확인하세요.
      </p>
    </div>
  );
}

function ItemDetail({ item, db, done, onToggleDone, onTop }: { item: GuideItem; db: DbChoice; done: boolean; onToggleDone: () => void; onTop: () => void }) {
  const [step, setStep] = useState(0);
  return (
    <div className="space-y-5 pt-1">
      {item.widget === 'ps-setup' && <PsSetupWidget script={PS_ALL} />}

      {/* download / manual links */}
      <div className="flex flex-wrap gap-2">
        {item.links.map((l) => (
          <Button key={l.href} asChild size="sm" variant={l.primary ? 'default' : 'outline'} className="gap-1.5">
            <a href={l.href} target="_blank" rel="noopener noreferrer">
              {l.label.includes('다운로드') ? <Download className="size-4" /> : l.primary ? <ExternalLink className="size-4" /> : <BookOpen className="size-4" />}
              {l.label}
            </a>
          </Button>
        ))}
        <Button asChild size="sm" variant="ghost" className="gap-1.5 text-muted-foreground">
          <a href={`${MANUAL_PATH}/${manualSlug(item, db)}`} target="_blank" rel="noopener noreferrer"><BookOpen className="size-4" />문서로 보기</a>
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <MotionGuide steps={item.steps} step={step} onStep={setStep} />
        <div>
          <h3 className="mb-2 text-sm font-semibold">단계별 매뉴얼 <span className="font-normal text-muted-foreground">— 누르면 해당 화면으로 이동</span></h3>
          <ol className="space-y-1">
            {item.steps.map((s, i) => (
              <li key={i}>
                <button
                  onClick={() => setStep(i)}
                  className={cn('flex w-full gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors', i === step ? 'bg-primary/10' : 'hover:bg-muted')}
                >
                  <span className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', i === step ? 'bg-primary text-primary-foreground' : i < step ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground')}>
                    {i < step ? <Check className="size-3" /> : i + 1}
                  </span>
                  <span className={cn('leading-snug', s.fast && 'text-muted-foreground')}>{s.text}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {item.widget === 'git-identity' && <GitIdentityWidget />}
      {item.widget === 'repo-commands' && <RepoCommandsWidget />}
      {item.widget === 'env-vars' && <EnvVarsWidget db={db} />}

      {item.commands && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">복사해서 쓰는 명령어</h3>
          {item.commands.map((c) => <CommandBlock key={c.label} label={c.label} note={c.note} code={c.code} />)}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {item.verify && (
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><CircleCheck className="size-4 text-emerald-500" />설치 확인</div>
            <CommandBlock code={item.verify.code} />
            <p className="mt-1.5 text-xs text-muted-foreground">이렇게 나오면 성공: <code className="rounded bg-muted px-1">{item.verify.expect}</code></p>
          </div>
        )}
        {item.notes && (
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Lightbulb className="size-4 text-amber-500" />알아두기</div>
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">{item.notes.map((n) => <li key={n}>{n}</li>)}</ul>
          </div>
        )}
      </div>

      {item.troubles && (
        <div className="rounded-lg border p-3">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><AlertTriangle className="size-4 text-destructive" />자주 막히는 곳</div>
          <dl className="space-y-2">
            {item.troubles.map((t) => (
              <div key={t.q}>
                <dt className="font-mono text-xs font-medium">{t.q}</dt>
                <dd className="mt-0.5 text-xs text-muted-foreground">→ {t.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={onTop} className="gap-1.5"><ArrowUp className="size-4" />항목 목록으로</Button>
        <Button variant={done ? 'outline' : 'default'} onClick={onToggleDone} className="gap-1.5">
          <CircleCheck className="size-4" />{done ? '완료 취소' : '이 단계 완료!'}
        </Button>
      </div>
    </div>
  );
}

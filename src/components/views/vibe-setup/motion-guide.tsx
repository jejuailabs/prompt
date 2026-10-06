'use client';

// Motion guide — re-draws each step as a simplified mock screen, then moves a fake cursor
// to the element the learner must touch and pulses a highlight around it.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, FastForward, Lock, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GuideStep, MockScreen } from './data';
import { CopyButton } from './widgets';

type Rect = { x: number; y: number; w: number; h: number };

const TYPE_MS = 28;

function stepDuration(step: GuideStep): number {
  if (step.screen.kind === 'terminal') {
    const chars = step.screen.lines.reduce((n, l) => n + Math.min(l.cmd?.length ?? 0, 70), 0);
    return Math.max(3200, chars * TYPE_MS + step.screen.lines.length * 450 + 1600);
  }
  return step.fast ? 2600 : 3800;
}

export function MotionGuide({ steps, step, onStep }: { steps: GuideStep[]; step: number; onStep: (i: number) => void }) {
  const reduce = useReducedMotion();
  const [playing, setPlaying] = useState(true);
  const [rect, setRect] = useState<Rect | null>(null);
  const [clickedStep, setClickedStep] = useState(-1);
  const clicked = clickedStep === step;
  const stageRef = useRef<HTMLDivElement>(null);
  const current = steps[step];

  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || !current?.target) { setRect(null); return; }
    const el = stage.querySelector<HTMLElement>(`[data-t="${current.target}"]`);
    if (!el) { setRect(null); return; }
    const s = stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setRect({ x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height });
  }, [current]);

  // Measure after the entering screen settles; re-measure on resize.
  useLayoutEffect(() => {
    const t1 = window.setTimeout(measure, 260);
    const t2 = window.setTimeout(() => setClickedStep(step), reduce ? 300 : 1300);
    window.addEventListener('resize', measure);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.removeEventListener('resize', measure); };
  }, [step, measure, reduce]);

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => {
      if (step < steps.length - 1) onStep(step + 1);
      else setPlaying(false);
    }, stepDuration(current));
    return () => window.clearTimeout(t);
  }, [playing, step, steps.length, current, onStep]);

  const atEnd = step === steps.length - 1 && !playing;
  const cursor = rect ? { x: rect.x + Math.min(rect.w * 0.6, rect.w - 8), y: rect.y + rect.h * 0.62 } : null;

  return (
    <div className="overflow-hidden rounded-xl border bg-muted/40">
      <div ref={stageRef} className="relative h-[300px] overflow-hidden p-3 sm:h-[340px] sm:p-4">
        <motion.div
          key={step}
          className="h-full"
          initial={reduce ? false : { opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22 }}
        >
          <Screen screen={current.screen} typing={playing && !reduce} />
        </motion.div>

        {rect && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute rounded-md border-2 border-primary ring-4 ring-primary/20"
            initial={false}
            animate={{ left: rect.x - 4, top: rect.y - 4, width: rect.w + 8, height: rect.h + 8, opacity: [0.55, 1, 0.55] }}
            transition={{ left: { duration: 0.35 }, top: { duration: 0.35 }, width: { duration: 0.35 }, height: { duration: 0.35 }, opacity: { duration: 1.2, repeat: Infinity } }}
          />
        )}

        {cursor && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 z-10"
            initial={false}
            animate={{ x: cursor.x, y: cursor.y }}
            transition={{ duration: reduce ? 0 : 0.8, ease: [0.4, 0, 0.2, 1] }}
          >
            {clicked && !reduce && (
              <motion.span
                key={`ripple-${step}`}
                className="absolute -left-4 -top-4 size-8 rounded-full bg-primary/40"
                initial={{ scale: 0.2, opacity: 0.9 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 0.6 }}
              />
            )}
            <motion.svg width="22" height="22" viewBox="0 0 24 24" animate={clicked && !reduce ? { scale: [1, 0.82, 1] } : {}} transition={{ duration: 0.25 }}>
              <path d="M4 2l15 9.5-6.6 1.4 3.8 7.4-2.9 1.5-3.8-7.4L4 19z" fill="white" stroke="black" strokeWidth="1.4" strokeLinejoin="round" />
            </motion.svg>
          </motion.div>
        )}

        {current.screen.kind === 'terminal' && current.copy !== '' && (current.copy || current.screen.lines.some((l) => l.cmd)) && (
          <CopyButton
            text={current.copy ?? current.screen.lines.filter((l) => l.cmd).map((l) => l.cmd).join('\n')}
            label={current.copy ? '전체 한번에 복사' : '명령 복사'}
            className="absolute right-5 top-[18px] z-20 sm:right-6 sm:top-[22px]"
          />
        )}

        {current.fast && (
          <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white">
            <FastForward className="size-3" />기본값 그대로
          </span>
        )}
      </div>

      <div className="border-t bg-background px-3 py-2.5">
        <p className="min-h-10 text-sm leading-snug">
          <span className="mr-1.5 font-semibold text-primary">{step + 1}/{steps.length}</span>
          {current.text}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <Button size="icon" variant="ghost" className="size-8" aria-label="이전 단계" disabled={step === 0} onClick={() => { setPlaying(false); onStep(step - 1); }}><ChevronLeft className="size-4" /></Button>
          <Button size="icon" variant="outline" className="size-8" aria-label={atEnd ? '처음부터 다시' : playing ? '일시정지' : '재생'} onClick={() => { if (atEnd) { onStep(0); setPlaying(true); } else setPlaying((p) => !p); }}>
            {atEnd ? <RotateCcw className="size-4" /> : playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Button>
          <Button size="icon" variant="ghost" className="size-8" aria-label="다음 단계" disabled={step === steps.length - 1} onClick={() => { setPlaying(false); onStep(step + 1); }}><ChevronRight className="size-4" /></Button>
          <div className="ml-2 flex flex-1 flex-wrap gap-1">
            {steps.map((_, i) => (
              <button
                key={i}
                aria-label={`${i + 1}단계로 이동`}
                onClick={() => { setPlaying(false); onStep(i); }}
                className={cn('h-1.5 rounded-full transition-all', i === step ? 'w-6 bg-primary' : i < step ? 'w-3 bg-primary/50' : 'w-3 bg-muted-foreground/25')}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── mock screens ───

function Screen({ screen, typing }: { screen: MockScreen; typing: boolean }) {
  switch (screen.kind) {
    case 'terminal': return <Terminal lines={screen.lines} typing={typing} app={screen.app} />;
    case 'editor': return <Editor {...screen} />;
    case 'browser':
      return (
        <Frame bar={<div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground"><Lock className="size-3 shrink-0" /><span className="truncate">{screen.url}</span></div>}>
          <Body body={screen} centered />
        </Frame>
      );
    case 'app':
      return <Frame bar={<span className="truncate text-xs font-medium">{screen.app}</span>}><Body body={screen} centered /></Frame>;
    case 'installer':
      return (
        <Frame bar={<span className="truncate text-xs font-medium">{screen.app}</span>} classic>
          <div className="flex h-full flex-col">
            <div className="border-b bg-background px-4 py-2.5">
              <div className="text-sm font-semibold">{screen.heading}</div>
              {screen.sub && <div className="text-xs text-muted-foreground">{screen.sub}</div>}
            </div>
            <div className="flex-1 overflow-hidden px-4 py-3"><Body body={{ ...screen, heading: undefined, sub: undefined, buttons: undefined }} /></div>
            <div className="flex justify-end gap-2 border-t bg-muted/60 px-3 py-2">
              {screen.buttons?.map((b, i) => <MockBtn key={i} t={`b${i}`} {...b} />)}
            </div>
          </div>
        </Frame>
      );
  }
}

function Frame({ bar, children, classic }: { bar: ReactNode; children: ReactNode; classic?: boolean }) {
  return (
    <div className={cn('flex h-full flex-col overflow-hidden border bg-card shadow-sm', classic ? 'mx-auto max-w-lg rounded-md' : 'rounded-lg')}>
      <div className="flex items-center gap-2 border-b bg-muted/70 px-2.5 py-1.5">
        {!classic && <span className="flex gap-1"><i className="size-2 rounded-full bg-red-400" /><i className="size-2 rounded-full bg-amber-400" /><i className="size-2 rounded-full bg-emerald-400" /></span>}
        {bar}
        {classic && <span className="ml-auto text-xs text-muted-foreground">✕</span>}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

type BodyProps = Extract<MockScreen, { kind: 'browser' }>;

function Body({ body, centered }: { body: Omit<BodyProps, 'kind' | 'url'>; centered?: boolean }) {
  return (
    <div className={cn('flex h-full flex-col gap-2 overflow-hidden text-xs', centered && 'mx-auto max-w-md justify-center p-4')}>
      {body.heading && <div className={cn('font-semibold', centered ? 'text-base' : 'text-sm')}>{body.heading}</div>}
      {body.sub && <div className="text-muted-foreground">{body.sub}</div>}
      {body.fields?.map((f, i) => (
        <label key={i} className="block">
          {f.label && <span className="mb-0.5 block text-[11px] text-muted-foreground">{f.label}</span>}
          <span data-t={`f${i}`} className={cn('block truncate rounded-md border bg-background px-2 py-1.5', f.mono && 'font-mono text-[11px]', !f.value && 'h-7')}>{f.value}</span>
        </label>
      ))}
      {body.options?.map((o, i) => (
        <div key={i} data-t={`o${i}`} className="flex items-start gap-2 rounded px-1 py-0.5">
          <OptionMark o={o} />
          <span className="leading-snug">{o.label}</span>
        </div>
      ))}
      {body.list?.map((r, i) => (
        <div key={i} className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5">
          <div className="min-w-0 flex-1"><div className="truncate font-medium">{r.label}</div>{r.meta && <div className="truncate text-[11px] text-muted-foreground">{r.meta}</div>}</div>
          {r.action && <span data-t={`l${i}`} className="rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background">{r.action}</span>}
        </div>
      ))}
      {body.code && (
        <pre className="overflow-hidden rounded-md bg-zinc-950 p-2 font-mono text-[10.5px] leading-relaxed text-zinc-100">{body.code.join('\n')}</pre>
      )}
      {body.buttons && body.buttons.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2">{body.buttons.map((b, i) => <MockBtn key={i} t={`b${i}`} {...b} />)}</div>
      )}
    </div>
  );
}

function OptionMark({ o }: { o: { checked?: boolean; type?: string } }) {
  if (o.type === 'toggle') return <span className={cn('mt-0.5 inline-flex h-3.5 w-6 shrink-0 items-center rounded-full p-0.5', o.checked ? 'justify-end bg-primary' : 'bg-muted-foreground/30')}><i className="size-2.5 rounded-full bg-white" /></span>;
  const round = o.type === 'radio';
  return (
    <span className={cn('mt-0.5 inline-flex size-3.5 shrink-0 items-center justify-center border', round ? 'rounded-full' : 'rounded-sm', o.checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/50 bg-background')}>
      {o.checked && (round ? <i className="size-1.5 rounded-full bg-primary-foreground" /> : <svg viewBox="0 0 12 12" className="size-2.5"><path d="M2 6.5l2.5 2.5L10 3" fill="none" stroke="currentColor" strokeWidth="2" /></svg>)}
    </span>
  );
}

function MockBtn({ t, label, primary }: { t: string; label: string; primary?: boolean }) {
  return <span data-t={t} className={cn('inline-flex items-center rounded-md border px-3 py-1 text-xs font-medium', primary ? 'border-primary bg-primary text-primary-foreground' : 'bg-background')}>{label}</span>;
}

function Editor({ files, active, code, palette }: Extract<MockScreen, { kind: 'editor' }>) {
  return (
    <Frame bar={<span className="truncate text-xs font-medium">Visual Studio Code</span>}>
      <div className="relative flex h-full text-xs">
        <div className="w-32 shrink-0 border-r bg-muted/50 p-2 sm:w-40">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">탐색기</div>
          {files.map((f, i) => <div key={i} className={cn('truncate rounded px-1.5 py-0.5', i === active && 'bg-primary/15 font-medium')}>{f}</div>)}
        </div>
        <pre className="min-w-0 flex-1 overflow-hidden whitespace-pre-wrap break-all p-3 font-mono text-[11px] leading-relaxed">
          {code?.map((l, i) => <div key={i}><span className="mr-3 select-none text-muted-foreground/60">{i + 1}</span>{l}</div>)}
        </pre>
        {palette && (
          <div className="absolute left-1/2 top-2 w-[78%] max-w-sm -translate-x-1/2 overflow-hidden rounded-md border bg-popover shadow-lg">
            <div className="border-b px-2 py-1.5 font-mono text-[11px]">{palette.query}</div>
            {palette.items.map((it, i) => <div key={i} data-t={`p${i}`} className={cn('px-2 py-1.5', i === 0 && 'bg-primary/10')}>{it}</div>)}
          </div>
        )}
      </div>
    </Frame>
  );
}

function Terminal({ lines, typing, app }: { lines: { cmd?: string; out?: string[] }[]; typing: boolean; app?: string }) {
  // Remounted per step (parent is keyed by step), so the typing counter always starts at 0.
  const total = lines.reduce((n, l) => n + (l.cmd?.length ?? 0), 0);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!typing) return;
    const id = window.setInterval(() => setCount((t) => Math.min(t + 1, total)), TYPE_MS);
    return () => window.clearInterval(id);
  }, [typing, total]);
  const typed = typing ? count : total;
  // Character offset where each command line starts.
  const starts = lines.reduce<number[]>((acc, l, i) => [...acc, i === 0 ? 0 : acc[i - 1] + (lines[i - 1].cmd?.length ?? 0)], []);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 font-mono text-[11.5px] text-zinc-100 shadow-sm">
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[11px] text-zinc-400">
        <span className="rounded bg-[#012456] px-1.5 text-white">PS</span> {app ?? 'Windows PowerShell'}
      </div>
      <div className="flex-1 space-y-1 overflow-hidden p-3">
        {lines.map((l, i) => {
          const budget = typed - starts[i];
          if (budget <= 0 && i > 0 && l.cmd) return null;
          const len = l.cmd?.length ?? 0;
          const shown = l.cmd ? l.cmd.slice(0, Math.max(0, budget)) : '';
          const done = budget >= len;
          return (
            <div key={i}>
              {l.cmd !== undefined && (
                <div className="break-all"><span className="text-emerald-400">PS C:\&gt; </span>{shown}{!done && <span className="ml-px inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-zinc-200" />}</div>
              )}
              {done && l.out?.map((o, j) => (
                <motion.div key={j} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 + j * 0.12 }} className="break-all text-zinc-300">{o}</motion.div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

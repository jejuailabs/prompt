'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Check, Copy, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { DbChoice } from './data';

// ─── storage (per-viewer convenience only; never required to render) ───
export function useStored<T>(key: string, init: T): [T, (v: T) => void] {
  // The view only renders client-side (hash router), so reading storage in the initializer is safe.
  const [val, setVal] = useState<T>(() => {
    if (typeof window === 'undefined') return init;
    try { const raw = localStorage.getItem(key); return raw !== null ? (JSON.parse(raw) as T) : init; } catch { return init; }
  });
  const set = (v: T) => {
    setVal(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage blocked */ }
  };
  return [val, set];
}

async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch { return false; }
  }
}

export function CopyButton({ text, label = '복사', className, disabled, primary }: { text: string; label?: string; className?: string; disabled?: boolean; primary?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      size="sm"
      variant={done || primary ? 'default' : 'outline'}
      className={cn('h-7 gap-1 px-2 text-xs', className)}
      disabled={disabled}
      onClick={async () => { if (await copyText(text)) { setDone(true); window.setTimeout(() => setDone(false), 1500); } }}
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{done ? '복사됨' : label}
    </Button>
  );
}

export function CommandBlock({ code, label, note, copyLabel }: { code: string; label?: string; note?: string; copyLabel?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      {(label || note) && (
        <div className="flex items-start justify-between gap-2 border-b bg-muted/50 px-3 py-1.5">
          <div className="min-w-0">
            {label && <div className="text-xs font-semibold">{label}</div>}
            {note && <div className="text-[11px] text-muted-foreground">{note}</div>}
          </div>
          <CopyButton text={code} label={copyLabel} />
        </div>
      )}
      <div className="relative">
        <pre className="overflow-x-auto bg-zinc-950 p-3 font-mono text-[12px] leading-relaxed text-zinc-100">{code}</pre>
        {!label && !note && <CopyButton text={code} label={copyLabel} className="absolute right-2 top-2" />}
      </div>
    </div>
  );
}

const PRIVACY = (
  <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
    <ShieldCheck className="mt-px size-3.5 shrink-0" />입력값은 이 브라우저 안에서만 명령어를 만드는 데 쓰이고, 서버로 보내지지 않아요.
  </p>
);

// ─── fill-in widgets: ① 크게 입력 → ② 버튼 하나로 복사 ───
function StepLabel({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-base font-bold">
      <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">{n}</span>
      {children}
    </div>
  );
}

function BigField({ label, value, placeholder, onChange, error, type = 'text', hint }: { label: string; value: string; placeholder: string; onChange: (v: string) => void; error?: string; type?: string; hint?: ReactNode }) {
  const empty = !value.trim();
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">{label}</span>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn('h-12 border-2 bg-background text-base', empty ? 'border-primary ring-4 ring-primary/15' : error ? 'border-destructive' : 'border-emerald-500')}
      />
      {error ? <span className="block text-xs text-destructive">{error}</span> : hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

/** Command preview where the user's own values are highlighted. */
function Preview({ parts }: { parts: (string | { v: string; ok: boolean })[][] }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-3 font-mono text-[13px] leading-7 text-zinc-300">
      {parts.map((line, i) => (
        <div key={i}>
          {line.map((p, j) => typeof p === 'string' ? <span key={j}>{p}</span> : <span key={j} className={cn('rounded px-1', p.ok ? 'bg-emerald-500/20 font-semibold text-emerald-300' : 'bg-amber-500/20 text-amber-300')}>{p.v}</span>)}
        </div>
      ))}
    </pre>
  );
}

function CopyStep({ n, ready, text, waitMsg, children }: { n: number; ready: boolean; text: string; waitMsg: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-xl border-2 p-4 transition-colors', ready ? 'border-primary bg-primary/5' : 'border-dashed opacity-80')}>
      <StepLabel n={n}>복사해서 PowerShell에 붙여넣기</StepLabel>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <CopyButton text={text} label="명령어 전체 복사" primary disabled={!ready} className="h-11 px-6 text-base" />
        <span className={cn('text-sm', ready ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>{ready ? '✓ 준비 완료! 버튼을 누르고 붙여넣기(오른쪽 클릭) → Enter' : waitMsg}</span>
      </div>
      {children}
    </div>
  );
}

// ─── Git identity ───
export function GitIdentityWidget() {
  const [user, setUser] = useStored('vibe-setup:git-user', { name: '', email: '' });
  const name = user.name.trim();
  const email = user.email.trim();
  const nameOk = /^[A-Za-z0-9-]+$/.test(name);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const ready = nameOk && emailOk;
  const text = [`git config --global user.name "${name}"`, `git config --global user.email "${email}"`, 'git config --global --list'].join('\n');

  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-primary/40 bg-card p-4">
        <StepLabel n={1}>내 정보 입력 <span className="text-sm font-normal text-muted-foreground">— 입력하면 아래 명령어에 자동으로 들어가요</span></StepLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <BigField label="GitHub 아이디" value={user.name} placeholder="예: my-id" onChange={(v) => setUser({ ...user, name: v })} error={name && !nameOk ? '영문 · 숫자 · 하이픈(-)만 사용해요' : undefined} hint="github.com/ 뒤에 붙는 내 아이디" />
          <BigField label="이메일" type="email" value={user.email} placeholder="예: me@gmail.com" onChange={(v) => setUser({ ...user, email: v })} error={email && !emailOk ? '이메일 형식을 확인해 주세요' : undefined} hint={<>GitHub 가입 이메일. 숨기고 싶다면 <a href="https://github.com/settings/emails" target="_blank" rel="noopener noreferrer" className="underline">noreply 주소</a> 사용</>} />
        </div>
      </div>
      <CopyStep n={2} ready={ready} text={text} waitMsg="↑ 아이디와 이메일을 먼저 입력하세요">
        <Preview parts={[
          ['git config --global user.name "', { v: name || '아이디', ok: nameOk }, '"'],
          ['git config --global user.email "', { v: email || '이메일', ok: emailOk }, '"'],
          ['git config --global --list   ', '# 마지막 줄: 잘 들어갔는지 확인'],
        ]} />
      </CopyStep>
      {PRIVACY}
    </div>
  );
}

// ─── Repo push commands ───
export function RepoCommandsWidget() {
  const [user] = useStored('vibe-setup:git-user', { name: '', email: '' });
  const [repo, setRepo] = useStored('vibe-setup:repo', { owner: '', name: 'my-first-app' });
  const owner = (repo.owner || user.name).trim();
  const name = repo.name.trim();
  const ready = /^[A-Za-z0-9-]+$/.test(owner) && /^[A-Za-z0-9._-]+$/.test(name);
  const url = `https://github.com/${owner}/${name}.git`;
  const text = ['git init', 'git add .', 'git commit -m "first commit"', 'git branch -M main', `git remote add origin ${url}`, 'git push -u origin main'].join('\n');
  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-primary/40 bg-card p-4">
        <StepLabel n={1}>아이디 · 리포지토리 이름 입력</StepLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <BigField label="GitHub 아이디" value={repo.owner || user.name} placeholder="예: my-id" onChange={(v) => setRepo({ ...repo, owner: v })} />
          <BigField label="리포지토리 이름" value={repo.name} placeholder="예: my-first-app" onChange={(v) => setRepo({ ...repo, name: v.replace(/\s+/g, '-') })} hint="GitHub에서 만든 이름과 똑같이" />
        </div>
      </div>
      <CopyStep n={2} ready={ready} text={text} waitMsg="↑ 아이디와 리포지토리 이름을 입력하세요">
        <Preview parts={[
          ['git init'], ['git add .'], ['git commit -m "first commit"'], ['git branch -M main'],
          ['git remote add origin https://github.com/', { v: owner || '아이디', ok: Boolean(owner) }, '/', { v: name || '이름', ok: Boolean(name) }, '.git'],
          ['git push -u origin main'],
        ]} />
      </CopyStep>
    </div>
  );
}

// ─── .env converter ───
const FB_KEYS: [string, string][] = [
  ['apiKey', 'NEXT_PUBLIC_FIREBASE_API_KEY'],
  ['authDomain', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
  ['projectId', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
  ['storageBucket', 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'],
  ['messagingSenderId', 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
  ['appId', 'NEXT_PUBLIC_FIREBASE_APP_ID'],
  ['measurementId', 'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID'],
];

export function EnvVarsWidget({ db }: { db: DbChoice }) {
  // Not persisted on purpose — keys stay in memory only.
  const [config, setConfig] = useState('');
  const [sbUrl, setSbUrl] = useState('');
  const [sbKey, setSbKey] = useState('');

  const env = useMemo(() => {
    if (db === 'supabase') {
      return [`NEXT_PUBLIC_SUPABASE_URL=${sbUrl.trim()}`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${sbKey.trim()}`].join('\n');
    }
    return FB_KEYS.flatMap(([k, envKey]) => {
      const m = config.match(new RegExp(`${k}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`));
      if (!m && k === 'measurementId') return [];
      return [`${envKey}=${m?.[1] ?? ''}`];
    }).join('\n');
  }, [db, config, sbUrl, sbKey]);

  const filled = db === 'supabase' ? Boolean(sbUrl.trim() && sbKey.trim()) : /apiKey/.test(config);

  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="text-sm font-semibold">🔁 {db === 'firebase' ? 'firebaseConfig를 붙여넣으면 .env 형식으로 바꿔줘요' : 'URL과 키를 넣으면 .env 형식으로 만들어줘요'}</div>
      {db === 'firebase' ? (
        <Textarea rows={5} className="font-mono text-xs" value={config} placeholder={'const firebaseConfig = {\n  apiKey: "AIza...",\n  ...\n};'} onChange={(e) => setConfig(e.target.value)} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1"><span className="text-xs font-medium">Project URL</span><Input className="font-mono text-xs" value={sbUrl} placeholder="https://abcd.supabase.co" onChange={(e) => setSbUrl(e.target.value)} /></label>
          <label className="space-y-1"><span className="text-xs font-medium">Publishable key (anon)</span><Input className="font-mono text-xs" value={sbKey} placeholder="sb_publishable_..." onChange={(e) => setSbKey(e.target.value)} /></label>
        </div>
      )}
      <CommandBlock label=".env.local 에 붙여넣을 내용" note={filled ? 'Vercel의 Environment Variables 칸에도 그대로 붙여넣으면 돼요' : '위에 값을 넣으면 오른쪽 값이 채워져요'} code={env} copyLabel="전체 복사" />
      {PRIVACY}
    </div>
  );
}

// ─── PowerShell one-shot setup ───
export function PsSetupWidget({ script }: { script: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4">
      <ol className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium">
        <li>① PowerShell 열기</li>
        <li>② 아래 버튼으로 전체 복사</li>
        <li>③ 창에 오른쪽 클릭(붙여넣기) → Enter</li>
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton text={script} label="전체 한번에 복사" primary className="h-10 px-5 text-sm" />
        <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => setShow(!show)}>{show ? '내용 접기' : '내용 보기'}</Button>
      </div>
      {show && <pre className="mt-3 overflow-x-auto rounded-md bg-zinc-950 p-3 font-mono text-[12px] leading-relaxed text-zinc-100">{script}</pre>}
    </div>
  );
}

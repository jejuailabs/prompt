'use client';

import { useMemo, useState } from 'react';
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

// ─── Git identity ───
export function GitIdentityWidget() {
  const [user, setUser] = useStored('vibe-setup:git-user', { name: '', email: '' });
  const nameOk = /^[A-Za-z0-9-]+$/.test(user.name.trim());
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email.trim());
  const name = user.name.trim() || '내GitHub아이디';
  const email = user.email.trim() || '내이메일@example.com';
  const lines = [`git config --global user.name "${name}"`, `git config --global user.email "${email}"`];
  const ready = nameOk && emailOk;

  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="text-sm font-semibold">✍️ 입력하면 명령어가 자동으로 완성돼요</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium">GitHub 아이디 (Username)</span>
          <Input value={user.name} placeholder="my-id" onChange={(e) => setUser({ ...user, name: e.target.value })} />
          {user.name && !nameOk && <span className="text-[11px] text-destructive">영문 · 숫자 · 하이픈(-)만 사용해요</span>}
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium">이메일 (GitHub 가입 이메일 또는 noreply 주소)</span>
          <Input type="email" value={user.email} placeholder="12345678+my-id@users.noreply.github.com" onChange={(e) => setUser({ ...user, email: e.target.value })} />
          {user.email && !emailOk && <span className="text-[11px] text-destructive">이메일 형식을 확인해 주세요</span>}
        </label>
      </div>
      <div className="space-y-2">
        {lines.map((l) => (
          <div key={l} className="flex items-center gap-2 rounded-md bg-zinc-950 py-1.5 pl-3 pr-1.5">
            <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[12px] text-zinc-100">{l}</code>
            <CopyButton text={l} disabled={!ready} />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton text={lines.join('\n')} label="두 줄 한번에 복사" disabled={!ready} className="h-8 px-3" />
        {!ready && <span className="text-[11px] text-muted-foreground">아이디와 이메일을 입력하면 복사 버튼이 켜져요</span>}
      </div>
      <CommandBlock label="확인" code="git config --global --list" />
      {PRIVACY}
    </div>
  );
}

// ─── Repo push commands ───
export function RepoCommandsWidget() {
  const [user] = useStored('vibe-setup:git-user', { name: '', email: '' });
  const [repo, setRepo] = useStored('vibe-setup:repo', { owner: '', name: 'my-first-app' });
  const owner = repo.owner || user.name;
  const url = `https://github.com/${owner.trim() || '내아이디'}/${repo.name.trim() || 'my-first-app'}.git`;
  const code = ['git init', 'git add .', 'git commit -m "first commit"', 'git branch -M main', `git remote add origin ${url}`, 'git push -u origin main'].join('\n');
  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="text-sm font-semibold">✍️ 아이디와 리포지토리 이름만 넣으세요</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium">GitHub 아이디</span>
          <Input value={owner} placeholder="my-id" onChange={(e) => setRepo({ ...repo, owner: e.target.value })} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium">리포지토리 이름</span>
          <Input value={repo.name} placeholder="my-first-app" onChange={(e) => setRepo({ ...repo, name: e.target.value.replace(/\s+/g, '-') })} />
        </label>
      </div>
      <CommandBlock label="첫 업로드 (프로젝트 폴더의 터미널에서)" note="한 번에 복사해서 붙여넣어도 순서대로 실행돼요" code={code} copyLabel="전체 복사" />
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

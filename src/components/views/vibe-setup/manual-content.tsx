// Server-safe (no hooks) renderers for the vibe-coding manual. Used by the crawlable
// /guide/vibe-coding pages and by the collapsed "전체 매뉴얼" section inside the app.
import { PS_ALL } from './data';
import { MANUAL_PATH, type ManualDoc } from './manual';

/** Commands a doc needs even when the app shows them through an interactive widget. */
function docCommands(doc: ManualDoc): { label: string; code: string }[] {
  const base = doc.item.commands?.map((c) => ({ label: c.label, code: c.code })) ?? [];
  switch (doc.slug) {
    case 'powershell-path':
      return [{ label: 'PowerShell에 한 번에 붙여넣기 (실행 허용 → PATH 등록 → 적용 → 확인)', code: PS_ALL }];
    case 'git-config-user':
      return [{ label: '내 아이디·이메일로 바꿔서 실행', code: 'git config --global user.name "내GitHub아이디"\ngit config --global user.email "내이메일@example.com"\ngit config --global --list' }];
    case 'github-repo-push':
      return [{ label: '프로젝트 폴더 터미널에서 실행 (아이디·리포지토리 이름만 바꾸기)', code: 'git init\ngit add .\ngit commit -m "first commit"\ngit branch -M main\ngit remote add origin https://github.com/내아이디/my-first-app.git\ngit push -u origin main' }];
    case 'env-firebase':
      return [{ label: '.env.local 예시', code: 'NEXT_PUBLIC_FIREBASE_API_KEY=\nNEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=\nNEXT_PUBLIC_FIREBASE_PROJECT_ID=\nNEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=\nNEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=\nNEXT_PUBLIC_FIREBASE_APP_ID=' }];
    case 'env-supabase':
      return [{ label: '.env.local 예시', code: 'NEXT_PUBLIC_SUPABASE_URL=\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=' }];
    default:
      return base;
  }
}

export function docFaq(doc: ManualDoc): [string, string][] {
  return [...(doc.seo.faq ?? []), ...(doc.item.troubles?.map((t) => [t.q, t.a] as [string, string]) ?? [])];
}

/** Full body of one manual document. `headingLevel` lets the hub nest docs under its own h2. */
export function ManualDocBody({ doc, compact }: { doc: ManualDoc; compact?: boolean }) {
  const H = compact ? 'h4' : 'h2';
  const commands = docCommands(doc);
  const faq = docFaq(doc);
  return (
    <div className="space-y-5 text-[15px] leading-7">
      <p className="rounded-lg border-l-4 border-primary bg-primary/5 px-4 py-3">{doc.seo.answer}</p>

      <section>
        <H className="mb-2 text-lg font-bold">따라 하기 ({doc.item.steps.length}단계 · 약 {doc.item.minutes}분)</H>
        <ol className="list-decimal space-y-1.5 pl-6">
          {doc.item.steps.map((s, i) => <li key={i}>{s.text}</li>)}
        </ol>
      </section>

      {commands.length > 0 && (
        <section>
          <H className="mb-2 text-lg font-bold">복사해서 쓰는 명령어</H>
          {commands.map((c) => (
            <figure key={c.label} className="mb-3">
              <figcaption className="mb-1 text-sm font-medium text-muted-foreground">{c.label}</figcaption>
              <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-zinc-100"><code>{c.code}</code></pre>
            </figure>
          ))}
        </section>
      )}

      {doc.item.verify && (
        <section>
          <H className="mb-2 text-lg font-bold">설치 확인</H>
          <p><code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">{doc.item.verify.code}</code> 를 실행했을 때 <strong>{doc.item.verify.expect}</strong> 처럼 나오면 성공입니다.</p>
        </section>
      )}

      {doc.item.notes && (
        <section>
          <H className="mb-2 text-lg font-bold">알아두기</H>
          <ul className="list-disc space-y-1 pl-6">{doc.item.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        </section>
      )}

      {faq.length > 0 && (
        <section>
          <H className="mb-2 text-lg font-bold">자주 묻는 질문 · 오류 해결</H>
          <dl className="space-y-3">
            {faq.map(([q, a]) => (
              <div key={q}>
                <dt className="font-semibold">Q. {q}</dt>
                <dd className="text-muted-foreground">A. {a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {doc.item.links.length > 0 && (
        <p className="text-sm text-muted-foreground">
          공식 링크:{' '}
          {doc.item.links.map((l, i) => <span key={l.href}>{i > 0 && ' · '}<a href={l.href} target="_blank" rel="noopener noreferrer" className="underline">{l.label}</a></span>)}
        </p>
      )}
    </div>
  );
}

/** Collapsed full manual: closed by default, anyone can open it to read every document. */
export function ManualFullCollapsible({ docs, linkDocs = true }: { docs: ManualDoc[]; linkDocs?: boolean }) {
  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold">
        <span>📖 바이브코딩 매뉴얼 전체 보기 <span className="font-normal text-muted-foreground">— {docs.length}개 문서</span></span>
        <span className="text-muted-foreground transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="space-y-10 border-t px-4 py-6">
        {docs.map((doc) => (
          <article key={doc.slug} id={`manual-${doc.slug}`}>
            <p className="text-xs font-semibold text-primary">{doc.step.step}단계 · {doc.step.title}</p>
            <h3 className="mb-3 text-xl font-bold">
              {linkDocs ? <a href={`${MANUAL_PATH}/${doc.slug}`} className="hover:underline">{doc.seo.title}</a> : doc.seo.title}
            </h3>
            <ManualDocBody doc={doc} compact />
          </article>
        ))}
      </div>
    </details>
  );
}

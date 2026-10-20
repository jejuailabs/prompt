'use client';
import { useQuery } from '@tanstack/react-query';
import { Check, Copy, Download } from 'lucide-react';
import { useState } from 'react';
import styles from './motion.module.css';

async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(text); return; } catch { /* permission denied: fall back below */ }
  }
  const area = document.createElement('textarea');
  area.value = text; area.setAttribute('readonly', ''); area.style.position = 'fixed'; area.style.opacity = '0';
  document.body.append(area); area.select();
  const ok = document.execCommand('copy'); area.remove();
  if (!ok) throw new Error('copy failed');
}

/** Loads a static code file and shows it with copy / save buttons. */
export function CodeBlock({ src, fileName, label }: { src: string; fileName: string; label: string }) {
  const code = useQuery({ queryKey: ['motion-code', src], queryFn: async () => { const res = await fetch(src); if (!res.ok) throw new Error(String(res.status)); return res.text(); }, staleTime: Infinity });
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  async function copy() {
    if (!code.data) return;
    try { await copyText(code.data); setStatus('copied'); } catch { setStatus('failed'); }
    setTimeout(() => setStatus('idle'), 2200);
  }
  function save() {
    if (!code.data) return;
    const url = URL.createObjectURL(new Blob([code.data], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = fileName; link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className={styles.code}>
      <div className={styles.codeBar}>
        <span>{label}</span>
        <div>
          <button onClick={copy} disabled={!code.data}>{status === 'copied' ? <Check size={13} /> : <Copy size={13} />}{status === 'copied' ? '복사했어요' : status === 'failed' ? '복사 실패' : '코드 복사'}</button>
          <button onClick={save} disabled={!code.data}><Download size={13} />파일 저장</button>
        </div>
      </div>
      {code.isPending && <p className={styles.codeNote} role="status">코드를 불러오는 중이에요.</p>}
      {code.isError && <p className={styles.codeNote} role="alert">코드를 불러오지 못했어요. <button onClick={() => code.refetch()}>다시 불러오기</button></p>}
      {code.data && <pre tabIndex={0}><code>{code.data}</code></pre>}
      {status === 'failed' && <p className={styles.codeNote} role="alert">브라우저가 복사를 막았어요. 코드를 직접 선택해 복사하거나 파일 저장을 써 주세요.</p>}
    </div>
  );
}

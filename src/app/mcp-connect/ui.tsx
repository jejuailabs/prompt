'use client';

import { useEffect, useState } from 'react';
import { PreviewNotice, useRuntime } from '@/components/runtime-context';

export default function McpConnect() {
  const { previewMode, authConfigured } = useRuntime();
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [base, setBase] = useState('');
  useEffect(() => { setBase(window.location.origin); }, []);
  async function rotate() {
    setMessage(''); setBusy(true);
    try {
      const response = await fetch('/api/mcp/token', { method: 'POST', credentials: 'same-origin' });
      const body = await response.json();
      if (!response.ok) { setMessage(body.error ?? '연결 키를 만들지 못했습니다. 먼저 로그인해주세요.'); return; }
      setToken(body.data.token);
      setMessage('새 연결 키를 만들었습니다. 이전 키는 즉시 해제됐습니다. 이 키를 안전한 곳에 보관하세요.');
    } catch { setMessage('서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.'); }
    finally { setBusy(false); }
  }
  async function revoke() {
    setMessage(''); setBusy(true);
    try {
      const response = await fetch('/api/mcp/token', { method: 'DELETE', credentials: 'same-origin' });
      const body = await response.json();
      if (!response.ok) { setMessage(body.error ?? '연결을 해제하지 못했습니다.'); return; }
      setToken('');
      setMessage('연결 키를 해제했습니다.');
    } catch { setMessage('서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.'); }
    finally { setBusy(false); }
  }
  return <main style={{ minHeight: '100vh', background: '#10110f', color: '#f4f1e9', padding: 'min(8vw,80px)', fontFamily: 'system-ui, sans-serif' }}>
    <a href="/#home" style={{ color: '#f36a47', textDecoration: 'none' }}>← PLAYLAB</a>
    <div style={{ maxWidth: 760, margin: '64px auto' }}>
      <p style={{ color: '#f36a47', letterSpacing: 3, fontSize: 12 }}>CREATE FROM YOUR EDITOR</p>
      <h1 style={{ fontFamily: 'serif', fontSize: 'clamp(36px,6vw,64px)', margin: '12px 0' }}>Codex · Claude Code 연결</h1>
      <p style={{ lineHeight: 1.8, color: '#b9bab3' }}>영상, 3D 에셋, 음악 작업을 대화에서 시작하고 진행 상태와 결과 파일을 확인하세요. 생성에는 계정 크레딧이 사용됩니다.</p>
      <p style={{ lineHeight: 1.8, color: '#b9bab3' }}>3D 생성은 MCP의 이미지 업로드 도구로 로컬 이미지 한 장을 올려 시작할 수 있습니다. 현재 3D 생성은 품질 검증 중이며, 관리자 또는 기능이 공개된 계정만 사용할 수 있습니다.</p>
      <PreviewNotice />
      {!previewMode && !authConfigured && <p role="status">로그인 서비스 연결 후 MCP 연결 키를 만들 수 있습니다.</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '30px 0' }}>
        <button disabled={busy || previewMode || !authConfigured} onClick={rotate} style={{ background: '#e84c2b', color: 'white', border: 0, padding: '14px 20px' }}>{busy ? '처리 중…' : '연결 키 만들기 · 기존 키 교체'}</button>
        <button disabled={busy || previewMode || !authConfigured} onClick={revoke} style={{ background: 'transparent', color: '#f4f1e9', border: '1px solid #555', padding: '14px 20px' }}>연결 해제</button>
      </div>
      {message && <p role="status">{message}</p>}
      {token && <div><p>이 키는 지금 한 번만 표시됩니다.</p><pre style={{ overflowX: 'auto', background: '#222520', padding: 18 }}>{token}</pre><button onClick={() => void navigator.clipboard.writeText(token).then(() => setMessage('연결 키를 복사했습니다.'), () => setMessage('복사하지 못했습니다. 위 키를 직접 선택해 복사해주세요.'))}>키 복사</button></div>}
      <h2 style={{ marginTop: 48 }}>연결 방법</h2>
      <p>저장소의 <code>mcp/README.md</code>에 있는 Codex 또는 Claude Code 명령에서 이 사이트 주소와 연결 키를 넣으세요.</p>
      <code style={{ color: '#e89b7f' }}>{base}</code>
    </div>
  </main>;
}

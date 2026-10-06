'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

async function toJpeg(file: File, quality: number, maxSize: number): Promise<Blob> {
  let source: Blob = file;
  if (/\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type)) {
    const { default: heic2any } = await import('heic2any');
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: quality / 100 });
    source = Array.isArray(converted) ? converted[0] : converted;
  }
  const url = URL.createObjectURL(source);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('이미지를 읽지 못했어요. 지원하는 파일 형식인지 확인해주세요.'));
      image.src = url;
    });
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('이 브라우저에서 이미지 변환을 시작하지 못했어요.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality / 100));
    if (!blob) throw new Error('이미지 변환에 실패했어요.');
    return blob;
  } finally { URL.revokeObjectURL(url); }
}

export function ConverterTool() {
  const [mode, setMode] = useState<'image' | 'merge' | 'imagepdf'>('image');
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState(82);
  const [maxSize, setMaxSize] = useState(2000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  async function convert() {
    if (!files.length) return;
    setBusy(true); setError(''); setDone('');
    try {
      if (files.some(file => file.size > 30 * 1024 * 1024)) throw new Error('파일 하나당 30MB 이하로 선택해주세요.');
      let result: Blob;
      let name: string;
      if (mode === 'image') {
        result = await toJpeg(files[0], quality, maxSize);
        name = `${files[0].name.replace(/\.[^.]+$/, '')}.jpg`;
      } else {
        const { PDFDocument } = await import('pdf-lib');
        const output = await PDFDocument.create();
        for (const file of files) {
          if (mode === 'merge') {
            const input = await PDFDocument.load(await file.arrayBuffer());
            const pages = await output.copyPages(input, input.getPageIndices());
            pages.forEach(page => output.addPage(page));
          } else {
            const bytes = await (await toJpeg(file, quality, maxSize)).arrayBuffer();
            const image = await output.embedJpg(bytes);
            const page = output.addPage([image.width, image.height]);
            page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
          }
        }
        result = new Blob([new Uint8Array(await output.save()).buffer as ArrayBuffer], { type: 'application/pdf' });
        name = mode === 'merge' ? 'playlab-merged.pdf' : 'playlab-images.pdf';
      }
      const url = URL.createObjectURL(result);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = name; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setDone(`${name} 변환을 완료하고 다운로드를 시작했어요.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '변환에 실패했어요.'); }
    finally { setBusy(false); }
  }

  return <section className="mt-10 rounded-2xl border bg-card p-6">
    <h2 className="text-2xl font-bold">무료 변환기 모음</h2>
    <p className="mt-2 text-sm text-muted-foreground">파일은 이 브라우저에서만 변환됩니다.</p>
    <div className="mt-5 flex flex-wrap gap-2">{([['image', '이미지 → JPG'], ['merge', 'PDF 병합'], ['imagepdf', '이미지 → PDF']] as const).map(([value, label]) => <button key={value} disabled={busy} aria-pressed={mode === value} onClick={() => { setMode(value); setFiles([]); setDone(''); setError(''); }} className={`rounded-full border px-4 py-2 text-sm ${mode === value ? 'border-primary bg-primary text-primary-foreground' : ''}`}>{label}</button>)}</div>
    <label className="mt-5 block text-sm">변환할 파일<input key={mode} aria-label="변환할 파일" type="file" multiple={mode !== 'image'} disabled={busy} accept={mode === 'merge' ? '.pdf,application/pdf' : '.heic,.heif,image/heic,image/heif,image/jpeg,image/png,image/webp'} onChange={event => { setFiles(Array.from(event.target.files || [])); setDone(''); setError(''); }} className="mt-2 block w-full min-w-0 rounded-lg border p-3 text-sm" /></label>
    {mode !== 'merge' && <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm">JPG 품질: {quality}%<input aria-label="JPG 품질" type="range" min="30" max="100" value={quality} onChange={event => setQuality(Number(event.target.value))} className="mt-2 block w-full" /></label><label className="text-sm">최대 길이<select aria-label="최대 길이" value={maxSize} onChange={event => setMaxSize(Number(event.target.value))} className="mt-2 block w-full rounded border bg-background p-2"><option value={1000}>1,000px</option><option value={2000}>2,000px</option><option value={4000}>4,000px</option></select></label></div>}
    <p className="mt-3 text-xs text-muted-foreground">{files.length ? `${files.length}개 파일 선택됨` : '파일당 30MB 이하 · HEIC, JPG, PNG, WebP 또는 PDF'}</p>
    <button disabled={busy || !files.length} onClick={() => void convert()} className="ribbon-cta mt-5">{busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}{busy ? '변환 중…' : '변환하고 다운로드'}</button>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    {done && <p role="status" className="mt-4 text-sm text-emerald-500">{done}</p>}
  </section>;
}

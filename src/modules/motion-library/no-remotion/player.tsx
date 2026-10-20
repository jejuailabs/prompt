'use client';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { flushSync } from 'react-dom';
import { Download, Loader2, Pause, Play, X } from 'lucide-react';
import { TimelineProvider } from './runtime';
import { recordMp4, RecordError } from './record';
import type { WebScene } from './scenes';
import styles from '../motion.module.css';

/** Plays a Motion Lite scene in the page and records it to MP4 on request. */
export function WebPlayer({ scene, fileName }: { scene: WebScene; fileName: string }) {
  const { config } = scene;
  const [Scene, setScene] = useState<ComponentType | null>(null);
  const [frame, setFrame] = useState(0), [playing, setPlaying] = useState(true);
  const [scale, setScale] = useState(0.5);
  const [recording, setRecording] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState(''), [videoUrl, setVideoUrl] = useState('');
  // The visible stage is also what gets recorded: off-screen nodes are not painted reliably.
  const frameBox = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), abort = useRef<AbortController | null>(null), busy = useRef(false);

  useEffect(() => { let alive = true; scene.load().then(mod => alive && setScene(() => mod.Scene)); return () => { alive = false; }; }, [scene]);

  useEffect(() => {
    const box = frameBox.current;
    if (!box) return;
    const fit = () => setScale(box.clientWidth / config.width);
    fit();
    const observer = new ResizeObserver(fit); observer.observe(box);
    return () => observer.disconnect();
  }, [config.width]);

  useEffect(() => {
    if (!playing || !Scene) return;
    let raf = 0, start = performance.now() - (frame / config.fps) * 1000;
    const tick = (now: number) => {
      if (busy.current) return;
      setFrame(Math.floor(((now - start) / 1000) * config.fps) % config.durationInFrames);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, Scene, config.fps, config.durationInFrames]);

  useEffect(() => () => { abort.current?.abort(); if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  async function record() {
    if (!Scene || recording) return;
    setPlaying(false); setMessage(''); if (videoUrl) { URL.revokeObjectURL(videoUrl); setVideoUrl(''); }
    abort.current = new AbortController();
    busy.current = true;
    flushSync(() => setRecording({ done: 0, total: config.durationInFrames }));
    try {
      const blob = await recordMp4({
        node: stage.current!, config, signal: abort.current.signal,
        showFrame: i => flushSync(() => setFrame(i)),
        onProgress: (done, total) => setRecording({ done, total }),
      });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      const link = document.createElement('a'); link.href = url; link.download = fileName; link.click();
      setMessage(`MP4를 만들었어요 (${(blob.size / 1024 / 1024).toFixed(1)}MB). 다운로드가 시작되지 않으면 아래 링크를 눌러 주세요.`);
    } catch (error) {
      setMessage(error instanceof RecordError ? error.message : '영상을 만들지 못했어요. 이미지가 다른 사이트에서 막혔거나 브라우저 메모리가 부족할 수 있어요.');
      console.error(error);
    } finally {
      busy.current = false; setRecording(null); abort.current = null;
    }
  }

  const seconds = (f: number) => (f / config.fps).toFixed(1);
  return (
    <div className={styles.player}>
      <div ref={frameBox} className={styles.playerFrame} style={{ aspectRatio: `${config.width} / ${config.height}` }}>
        {Scene ? <div ref={stage} className={styles.playerStage} style={{ width: config.width, height: config.height, transform: `scale(${scale})` }}>
          <TimelineProvider frame={frame} config={config}><Scene /></TimelineProvider>
        </div> : <p className={styles.codeNote} role="status"><Loader2 size={14} className={styles.spin} /> 장면을 불러오는 중이에요.</p>}
      </div>
      <div className={styles.playerBar}>
        <button onClick={() => setPlaying(p => !p)} disabled={!Scene || !!recording} aria-label={playing ? '일시정지' : '재생'}>{playing ? <Pause size={15} /> : <Play size={15} />}</button>
        <input type="range" min={0} max={config.durationInFrames - 1} value={frame} disabled={!Scene || !!recording} aria-label="재생 위치"
          onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }} />
        <span>{seconds(frame)}s / {seconds(config.durationInFrames)}s</span>
        {recording
          ? <button className={styles.recordButton} onClick={() => abort.current?.abort()}><X size={14} />취소 {Math.round((recording.done / recording.total) * 100)}%</button>
          : <button className={styles.recordButton} onClick={record} disabled={!Scene}><Download size={14} />MP4 만들기</button>}
      </div>
      {recording && <progress className={styles.recordProgress} value={recording.done} max={recording.total} aria-label="영상 만드는 중" />}
      {message && <p className={styles.codeNote} role="status">{message} {videoUrl && <a href={videoUrl} download={fileName}>{fileName}</a>}</p>}
    </div>
  );
}

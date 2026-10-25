'use client';

import type { ReactNode, Ref } from 'react';
import { ArrowLeft, Gamepad2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import styles from './game-post.module.css';

interface GamePostProps {
  game: { title: string; description: string; fileUrl: string | null; contentUrl: string | null; ownerName: string; metadata: Record<string, unknown> };
  onPlay: () => void;
  onBack: () => void;
  playButtonRef: Ref<HTMLButtonElement>;
  actions: ReactNode;
}

/** A game post is readable without mounting its executable document. */
export function GamePost({ game, onPlay, onBack, playButtonRef, actions }: GamePostProps) {
  const controls = typeof game.metadata.controls === 'string' ? game.metadata.controls : '';
  return <main className={styles.page} data-game-post>
    <Button variant="ghost" size="sm" className={styles.back} onClick={onBack}><ArrowLeft className="size-4" />게임 목록</Button>
    <div className={styles.layout}>
      <section className={styles.previewPanel} aria-label="게임 미리보기">
        <button ref={playButtonRef} type="button" data-game-launch className={styles.preview} onClick={onPlay} disabled={!game.contentUrl} aria-label={`${game.title} 플레이`}>
          {game.fileUrl ? <img src={game.fileUrl} alt={`${game.title} 미리보기`} className={styles.poster} /> : <Gamepad2 className={styles.placeholder} aria-hidden="true" />}
          <span className={styles.shade} />
          <span className={styles.launch}><span className={styles.playIcon}><Play fill="currentColor" aria-hidden="true" /></span><strong>플레이</strong><small>{game.contentUrl ? '버튼을 눌러 게임을 시작하세요' : '게임 콘텐츠를 준비하고 있어요'}</small></span>
        </button>
        <div className={styles.caption}><Gamepad2 className="size-4" /><span>{game.title}</span><small>클릭해서 시작</small></div>
      </section>
      <section className={styles.description} aria-label="게임 설명">
        <p className={styles.eyebrow}>만들어보기 · 게임</p>
        <h1>{game.title}</h1>
        <p className={styles.body}>{game.description || '플레이 버튼을 눌러 게임을 즐겨보세요.'}</p>
        {controls && <div className={styles.controls}><h2>조작 방법</h2><p>{controls}</p></div>}
        {game.ownerName && <p className={styles.creator}>만든 사람 <strong>{game.ownerName}</strong></p>}
        <div className={styles.actions}>{actions}</div>
      </section>
    </div>
  </main>;
}

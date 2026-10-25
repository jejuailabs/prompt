import { ArrowUpRight, Bookmark } from 'lucide-react';
import styles from './board.module.css';

// User-provided bookmarks. No preview scraping or third-party requests are needed.
export const VIDEO_RESOURCES = [
  { label: '연기', name: 'Seedance Emotion Direction', url: 'https://seedance-emotion-direction.vercel.app/' },
  { label: '카메라', name: 'AI Camera Movements', url: 'https://aicameramovements.com' },
  { label: '모션', name: 'Prompt Motion', url: 'https://prompt-motion.com' },
] as const;

export function ResourceCollection() {
  return (
    <section className={styles.resourceCollection} aria-labelledby="video-resources-title">
      <div className={styles.resourceHeading}>
        <Bookmark size={20} aria-hidden="true" />
        <div><h2 id="video-resources-title">영상 제작 참고 사이트</h2><p>영상에서 소개된 연기·카메라·모션 사이트를 모았어요.</p></div>
      </div>
      <ul className={styles.resourceLinks}>
        {VIDEO_RESOURCES.map((item) => (
          <li key={item.url}>
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              <span className={styles.tag} data-tone="tip">{item.label}</span>
              <span className={styles.resourceInfo}><strong>{item.name}</strong><small>{new URL(item.url).hostname}</small></span>
              <ArrowUpRight size={18} aria-hidden="true" /><span className="sr-only">새 창에서 열기</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

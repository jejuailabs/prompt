'use client';

import { useState, useSyncExternalStore } from 'react';
import { ArrowUpRight, Check, ChevronDown, Copy, Plus } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { GUIDE_CATEGORIES, GUIDE_SERVICES, guideCategoryLabel, type GuideCategory, type GuideService } from './catalogue';
import styles from './guide.module.css';

// Shelf rows follow the aiguidepage AI 전시관: 5 covers per shelf, 3 on tablets, 2 on phones.
const subscribe = (listener: () => void) => { window.addEventListener('resize', listener); return () => window.removeEventListener('resize', listener); };
const perShelf = () => (window.innerWidth < 640 ? 2 : window.innerWidth < 1024 ? 3 : 5);

function Cover({ item }: { item: GuideService }) {
  return (
    <div className={styles.cover} data-cover={item.cover}>
      <div className={styles.art} aria-hidden="true"><span /><span /><span /></div>
      <img className={styles.logo} src={`/coai/brands/${item.logo}`} alt="" draggable={false} />
      <span className={styles.name}>{item.name}</span>
    </div>
  );
}

function Stage({ item }: { item: GuideService }) {
  const [details, setDetails] = useState(false);
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copy = async () => {
    try { await navigator.clipboard.writeText(item.prompt); setCopied('copied'); }
    catch { setCopied('failed'); }
  };
  return (
    <div className={styles.stage}>
      <div className={styles.stageCover}><Cover item={item} /></div>
      <div className={styles.stageContent}>
        <span className={styles.eyebrow}>MEET YOUR NEXT AI</span>
        <DialogTitle className={styles.stageTitle}>{item.name}</DialogTitle>
        <DialogDescription className={styles.stageSummary}>{item.summary}</DialogDescription>
        <div className={styles.stageTags}><span>{item.categories.map(guideCategoryLabel).join(' · ')}</span><span>한국어로 대화해 보세요</span></div>
        <p className={styles.stageDescription}>{item.description}</p>
        <a className={styles.launch} href={item.url} target="_blank" rel="noopener noreferrer">사이트 열기<ArrowUpRight size={18} /></a>
        <button type="button" className={styles.detailsToggle} aria-expanded={details} onClick={() => setDetails(!details)}>
          {details ? '간단히 보기' : '자세히 알아보기'}<ChevronDown size={17} data-open={details} />
        </button>
      </div>
      {details && <section className={styles.stageDetails}>
        <div><h3>이런 일을 할 수 있어요</h3><ul>{item.features.map((feature) => <li key={feature}><Plus size={15} />{feature}</li>)}</ul></div>
        <div>
          <h3>이렇게 말해 보세요</h3><p>{item.prompt}</p>
          <button type="button" className={styles.copy} onClick={() => void copy()}>{copied === 'copied' ? <Check size={16} /> : <Copy size={16} />}{copied === 'copied' ? '복사했어요' : '예시 복사'}</button>
          {copied === 'failed' && <span role="status" className={styles.copyError}>복사하지 못했어요. 문장을 선택해 복사해 주세요.</span>}
        </div>
        <p className={styles.notice}>이용 조건과 요금은 각 서비스에서 확인해 주세요.<br />개인정보와 중요한 회사 정보는 입력하지 마세요.</p>
      </section>}
    </div>
  );
}

/** 가이드 > AI 서비스 사용설명서: the aiguidepage shelf of AI covers with a detail stage (docs/coai/04 §6). */
export default function AiGuideView() {
  const params = useAppStore((s) => s.params);
  const navigate = useAppStore((s) => s.navigate);
  const [category, setCategory] = useState<GuideCategory | ''>('');
  const columns = useSyncExternalStore(subscribe, perShelf, () => 5);
  const rows = Array.from({ length: Math.ceil(GUIDE_SERVICES.length / columns) }, (_, i) => GUIDE_SERVICES.slice(i * columns, (i + 1) * columns));
  const open = GUIDE_SERVICES.find((item) => item.id === params.id);
  const visible = category ? GUIDE_SERVICES.filter((item) => item.categories.includes(category)).length : GUIDE_SERVICES.length;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>A LITTLE CURIOSITY, ENDLESS POSSIBILITIES</p>
        <h1>오늘은 어떤 AI를 만나볼까요?</h1>
        <div className={styles.heroFoot}><p>궁금한 AI를 골라 바로 시작해 보세요.</p><span>카드를 누르면 더 자세히 볼 수 있어요</span></div>
      </header>

      <div className={styles.collectionHead}><span>THE AI COLLECTION</span><span>{visible}가지 AI, 무한한 가능성</span></div>
      <div className={styles.shelves}>
        {rows.map((row, index) => (
          <section key={index} className={styles.shelfRow} aria-label={`AI 선반 ${index + 1}`}>
            <div className={styles.shelfItems} style={{ '--columns': columns } as React.CSSProperties}>
              {row.map((item) => (
                <article key={item.id} className={styles.card} data-dimmed={Boolean(category && !item.categories.includes(category))}>
                  <div className={styles.object}>
                    <button type="button" className={styles.trigger} aria-label={`${item.name} 설명 보기`} onClick={() => navigate('ai-guide', { id: item.id })}><Cover item={item} /></button>
                    <div className={styles.actions}>
                      <a className={styles.actionPrimary} href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${item.name} 사이트 열기 (새 창)`}>열기<ArrowUpRight size={15} /></a>
                      <button type="button" className={styles.actionSecondary} onClick={() => navigate('ai-guide', { id: item.id })}>설명</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className={styles.shelf} aria-hidden="true"><div /><div /></div>
          </section>
        ))}
      </div>

      <div className={styles.filters} role="group" aria-label="관심 있는 분야로 둘러보기">
        {GUIDE_CATEGORIES.map((item) => <button key={item.id || 'all'} type="button" aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</button>)}
      </div>

      <footer className={styles.footer}>
        <p>새로운 가능성을, 더 가까이.</p>
        <button type="button" onClick={() => navigate('vibe-setup')}>바이브코딩 시작 가이드<ArrowUpRight size={15} /></button>
      </footer>

      <Dialog open={Boolean(open)} onOpenChange={(next) => { if (!next) navigate('ai-guide'); }}>
        <DialogContent className={styles.panel}>{open && <Stage key={open.id} item={open} />}</DialogContent>
      </Dialog>
    </div>
  );
}

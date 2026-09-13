'use client';

import { useState } from 'react';
import {
  ArrowRight, Check, ChevronLeft, Copy, Image, FileText, Film, Music,
  Loader2, Sparkles, LinkIcon, Upload, X,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type OutputType = 'image' | 'video' | 'report' | 'presentation' | 'music' | 'code' | 'marketing' | 'other';
type Step = 'type' | 'input' | 'result';

const OUTPUT_OPTIONS: { id: OutputType; label: string; icon: typeof Image; desc: string }[] = [
  { id: 'image', label: '이미지', icon: Image, desc: '포스터, 일러스트, 제품샷' },
  { id: 'video', label: '영상', icon: Film, desc: '쇼츠, 광고, 뮤비' },
  { id: 'report', label: '보고서', icon: FileText, desc: '분석, 리서치, IR' },
  { id: 'marketing', label: '마케팅', icon: Sparkles, desc: '카피, 광고, SNS' },
  { id: 'music', label: '음악', icon: Music, desc: '작곡, 가사, BGM' },
  { id: 'presentation', label: '기획서', icon: FileText, desc: '제안서, 발표자료' },
];

const PURPOSE_SUGGESTIONS: Record<string, string[]> = {
  image: ['SNS 콘텐츠', '상세페이지', '유튜브 썸네일', '브랜드 디자인'],
  video: ['유튜브 쇼츠', '제품 홍보', '교육 콘텐츠', '뮤직비디오'],
  report: ['내부 보고', '임원 보고', '투자자 IR', '시장 분석'],
  marketing: ['인스타그램', '블로그', '광고 카피', '이메일 캠페인'],
  music: ['배경음악', '광고 징글', '유튜브 BGM', '앨범 트랙'],
  presentation: ['사업 제안', '프로젝트 기획', '스타트업 피칭', '팀 보고'],
};

interface PromptResult {
  domain: string;
  expertRole: string;
  finalPrompt: string;
  outputCategory: 'image' | 'video' | 'music' | 'text';
  title: string;
}

export function MetaPromptBar() {
  const navigate = useAppStore((s) => s.navigate);
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('type');
  const [outputType, setOutputType] = useState<OutputType | ''>('');
  const [purpose, setPurpose] = useState('');
  const [description, setDescription] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [showRefUrl, setShowRefUrl] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PromptResult | null>(null);
  const [error, setError] = useState('');

  const reset = () => {
    setStep('type');
    setOutputType('');
    setPurpose('');
    setDescription('');
    setReferenceUrl('');
    setShowRefUrl(false);
    setResult(null);
    setError('');
  };

  const generate = async () => {
    if (!outputType || !description.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tools/metaprompt-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outputType: OUTPUT_OPTIONS.find((o) => o.id === outputType)?.label ?? outputType,
          purpose,
          description: description.trim(),
          referenceUrl: referenceUrl.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResult(json.data);
      setStep('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : '프롬프트 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = () => {
    if (!result) return;
    if (result.outputCategory === 'image') {
      navigator.clipboard.writeText(result.finalPrompt);
      toast({ title: '프롬프트가 복사되었습니다' });
      navigate('lab');
    } else if (result.outputCategory === 'video') {
      navigator.clipboard.writeText(result.finalPrompt);
      toast({ title: '프롬프트가 복사되었습니다' });
      navigate('tool', { slug: 'storyboard' });
    } else if (result.outputCategory === 'music') {
      navigator.clipboard.writeText(result.finalPrompt);
      toast({ title: '프롬프트가 복사되었습니다' });
      navigate('tool', { slug: 'suno' });
    } else {
      navigator.clipboard.writeText(result.finalPrompt);
      toast({ title: '프롬프트가 복사되었습니다' });
    }
  };

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-base">AI 프롬프트 메이커</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">BETA</span>
        </div>
        {step !== 'type' && (
          <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">
            처음으로
          </button>
        )}
      </div>

      {/* Step 1: Choose output type */}
      {step === 'type' && (
        <div>
          <p className="text-sm text-muted-foreground mb-3">무엇을 만들고 싶으세요?</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {OUTPUT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => { setOutputType(opt.id); setStep('input'); }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all hover:border-primary/50 hover:bg-primary/5"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-xs font-medium">{opt.label}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Input details */}
      {step === 'input' && outputType && (
        <div className="space-y-4">
          {/* Purpose suggestions */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">어디에 쓸 건가요? <span className="text-[10px]">(선택)</span></p>
            <div className="flex flex-wrap gap-1.5">
              {(PURPOSE_SUGGESTIONS[outputType] ?? []).map((s) => (
                <button
                  key={s}
                  onClick={() => setPurpose(purpose === s ? '' : s)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    purpose === s
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:border-primary/40'
                  }`}
                >
                  {s}
                </button>
              ))}
              <input
                value={PURPOSE_SUGGESTIONS[outputType]?.includes(purpose) ? '' : purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="직접 입력"
                className="rounded-full border bg-transparent px-3 py-1.5 text-xs w-24 focus:w-40 transition-all focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">어떤 걸 만들고 싶은지 자유롭게 설명해 주세요</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                outputType === 'image' ? '예: 제주 바다가 보이는 카페에서 아이스 아메리카노를 마시는 장면, 따뜻한 오후 감성' :
                outputType === 'video' ? '예: 신제품 런칭 30초 숏폼, 임팩트 있는 오프닝과 CTA' :
                outputType === 'report' ? '예: Q3 매출 분석 보고서, 전년 대비 성장률과 핵심 인사이트 중심' :
                outputType === 'marketing' ? '예: 20대 여성 타겟 인스타 카드뉴스, 친근한 톤의 뷰티 제품 소개' :
                outputType === 'music' ? '예: 카페에서 틀기 좋은 재즈 힙합, 몽환적이고 따뜻한 느낌' :
                '예: 원하는 결과물을 자유롭게 설명해 주세요'
              }
              rows={3}
              className="w-full rounded-xl border bg-background p-3 text-sm leading-relaxed focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>

          {/* Reference URL */}
          {!showRefUrl ? (
            <button
              onClick={() => setShowRefUrl(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <LinkIcon className="h-3 w-3" /> 참고 URL 추가
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-xs focus:outline-none focus:border-primary/50"
              />
              <button onClick={() => { setShowRefUrl(false); setReferenceUrl(''); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Generate button */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep('type')}>
              <ChevronLeft className="h-4 w-4 mr-1" /> 뒤로
            </Button>
            <Button
              onClick={generate}
              disabled={loading || !description.trim()}
              className="flex-1 sm:flex-none"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1" /> 프롬프트 생성 중...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-1" /> 프롬프트 만들기</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 'result' && result && (
        <div className="space-y-4">
          {/* Domain badge + expert role */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{result.domain}</span>
            <span className="text-xs text-muted-foreground">{result.expertRole}</span>
          </div>

          {/* Prompt */}
          <div className="rounded-xl border bg-background p-4 max-h-60 overflow-y-auto">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-7">{result.finalPrompt}</pre>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(result.finalPrompt);
                toast({ title: '클립보드에 복사되었습니다' });
              }}
            >
              <Copy className="h-3.5 w-3.5 mr-1" /> 복사
            </Button>

            {result.outputCategory === 'image' && (
              <Button size="sm" onClick={handleAction}>
                <Image className="h-3.5 w-3.5 mr-1" /> 이미지 생성하러 가기
              </Button>
            )}
            {result.outputCategory === 'video' && (
              <Button size="sm" onClick={handleAction}>
                <Film className="h-3.5 w-3.5 mr-1" /> 영상 기획하러 가기
              </Button>
            )}
            {result.outputCategory === 'music' && (
              <Button size="sm" onClick={handleAction}>
                <Music className="h-3.5 w-3.5 mr-1" /> 음악 만들러 가기
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={reset}>
              새로 만들기
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

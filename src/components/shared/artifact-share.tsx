'use client';

import { useState } from 'react';
import { Code2, Copy, Share2 } from 'lucide-react';
import { artifactEmbedCode, artifactShareUrl } from '@/lib/artifact-embed';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function ArtifactShare({ id, title, game = false, embeddable = true, onOpen }: {
  id: string; title: string; game?: boolean; embeddable?: boolean; onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const link = origin ? artifactShareUrl(origin, id, game) : '';
  const code = origin ? artifactEmbedCode(origin, id, title) : '';
  const copy = async (value: string, name: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${name}가 복사되었습니다` });
    } catch {
      toast({ title: '복사하지 못했어요', description: '아래 내용을 선택해 직접 복사해주세요.', variant: 'destructive' });
    }
  };
  return <>
    <Button data-artifact-share aria-label="공유 · 퍼가기" variant="outline" size="sm" onClick={() => { onOpen?.(); setOpen(true); }}><Share2 className="size-4" /><span className="hidden sm:inline">공유 · 퍼가기</span></Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg" onEscapeKeyDown={event => event.stopPropagation()}>
        <DialogHeader><DialogTitle>공유 · 퍼가기</DialogTitle><DialogDescription>{title}을 링크로 공유하거나 다른 웹페이지에 넣어보세요.</DialogDescription></DialogHeader>
        <div className="space-y-2">
          <label htmlFor={`share-link-${id}`} className="text-sm font-medium">공유 링크</label>
          <Input id={`share-link-${id}`} value={link} readOnly onFocus={event => event.target.select()} />
          <Button variant="outline" size="sm" onClick={() => void copy(link, '링크')}><Copy className="size-4" />링크 복사</Button>
        </div>
        {embeddable ? <div className="space-y-2">
          <label htmlFor={`embed-code-${id}`} className="text-sm font-medium">퍼가기 HTML 코드</label>
          <Textarea id={`embed-code-${id}`} value={code} readOnly rows={5} className="break-all font-mono text-xs" onFocus={event => event.target.select()} />
          <p className="text-xs text-muted-foreground">블로그·웹사이트의 HTML 편집 화면에 붙여넣으세요. iframe을 허용하는 곳에서 사용할 수 있습니다. 공개된 작품만 표시됩니다.</p>
          <Button size="sm" onClick={() => void copy(code, '퍼가기 코드')}><Code2 className="size-4" />퍼가기 코드 복사</Button>
        </div> : <p className="text-sm text-muted-foreground">공개·게시 상태의 작품만 퍼갈 수 있습니다.</p>}
      </DialogContent>
    </Dialog>
  </>;
}

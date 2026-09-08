'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/lib/store';
import { api, uploadFile } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { PromptDTO } from '@/lib/types';

const CATEGORIES = ['이미지', '영상', '코딩', '마케팅', '게임', '기타'] as const;
const CATEGORY_EN: Record<(typeof CATEGORIES)[number], string> = {
  이미지: 'Image',
  영상: 'Video',
  코딩: 'Coding',
  마케팅: 'Marketing',
  게임: 'Game',
  기타: 'Other',
};

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

/**
 * Quick "new prompt" form (header Create menu / gallery view).
 * On save: POST /api/prompts; optional image → upload + POST /api/artifacts linked to the prompt.
 */
export function CreatePromptDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const requireLogin = useAppStore((s) => s.requireLogin);
  const { toast } = useToast();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<string>('이미지');
  const [tagsInput, setTagsInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);

  const reset = () => {
    setTitle('');
    setBody('');
    setCategory('이미지');
    setTagsInput('');
    setFile(null);
  };

  const submit = async () => {
    if (!requireLogin()) return;
    if (!title.trim() || !body.trim()) {
      toast({
        title: locale === 'en' ? 'Missing fields' : '필수 항목 누락',
        description: locale === 'en' ? 'Title and body are required.' : '제목과 내용을 입력하세요.',
        variant: 'destructive',
      });
      return;
    }
    setPending(true);
    try {
      const modelTags = tagsInput.split(',').map((s) => s.trim()).filter(Boolean);
      const prompt = await api.post<PromptDTO>('/api/prompts', {
        title: title.trim(),
        body: body.trim(),
        category,
        modelTags,
      });

      if (file) {
        const { url } = await uploadFile(file);
        await api.post('/api/artifacts', {
          title: title.trim(),
          type: 'image',
          fileUrl: url,
          sourcePromptId: prompt.id,
          sourceModule: 'prompt-wiki',
          publish: true,
        });
      }

      toast({ title: t('saved') });
      onOpenChange(false);
      reset();
      void qc.invalidateQueries({ queryKey: ['prompts'] });
      void qc.invalidateQueries({ queryKey: ['artifacts'] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
    } catch (e) {
      toast({ title: t('error'), description: errorMessage(e), variant: 'destructive' });
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('createPromptTitle')}</DialogTitle>
          <DialogDescription className="text-xs">{t('tagline')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="create-prompt-title">{t('title')}</Label>
            <Input
              id="create-prompt-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              disabled={pending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-prompt-body">{t('body')}</Label>
            <Textarea
              id="create-prompt-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              disabled={pending}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('category')}</Label>
              <Select value={category} onValueChange={setCategory} disabled={pending}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {locale === 'en' ? CATEGORY_EN[c] : c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-prompt-tags">{t('modelTags')}</Label>
              <Input
                id="create-prompt-tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="SDXL, Flux, GPT..."
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-prompt-file">{t('attachResult')}</Label>
            <Input
              id="create-prompt-file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={pending}
              className="file:mr-2 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-0.5 file:text-xs file:text-secondary-foreground"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {t('cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={pending || !title.trim() || !body.trim()}>
            {pending ? t('loading') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

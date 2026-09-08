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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

/**
 * Upload an image/text artifact to the gallery (prompt-wiki module).
 * Image type requires a file (uploaded on submit); publish toggle defaults to ON.
 */
export function UploadArtifactDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const requireLogin = useAppStore((s) => s.requireLogin);
  const { toast } = useToast();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<'image' | 'text'>('image');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [publish, setPublish] = useState(true);
  const [pending, setPending] = useState(false);

  const reset = () => {
    setTitle('');
    setType('image');
    setDescription('');
    setFile(null);
    setPublish(true);
  };

  const submit = async () => {
    if (!requireLogin()) return;
    if (!title.trim()) {
      toast({
        title: locale === 'en' ? 'Missing fields' : '필수 항목 누락',
        description: locale === 'en' ? 'Title is required.' : '제목을 입력하세요.',
        variant: 'destructive',
      });
      return;
    }
    if (type === 'image' && !file) {
      toast({
        title: locale === 'en' ? 'Missing fields' : '필수 항목 누락',
        description: locale === 'en' ? 'Select an image file.' : '이미지 파일을 선택하세요.',
        variant: 'destructive',
      });
      return;
    }
    setPending(true);
    try {
      let fileUrl: string | undefined;
      if (type === 'image' && file) {
        const res = await uploadFile(file);
        fileUrl = res.url;
      }
      await api.post('/api/artifacts', {
        type,
        title: title.trim(),
        description: description.trim(),
        fileUrl,
        publish,
        sourceModule: 'prompt-wiki',
      });
      toast({ title: t('saved') });
      onOpenChange(false);
      reset();
      void qc.invalidateQueries({ queryKey: ['artifacts'] });
      void qc.invalidateQueries({ queryKey: ['feed'] });
      void qc.invalidateQueries({ queryKey: ['my-projects'] });
    } catch (e) {
      toast({ title: t('error'), description: errorMessage(e), variant: 'destructive' });
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('uploadTitle')}</DialogTitle>
          <DialogDescription className="text-xs">{t('uploadDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="upload-title">{t('title')}</Label>
            <Input id="upload-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} disabled={pending} />
          </div>

          <div className="space-y-1.5">
            <Label>{t('category')}</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'image' | 'text')} disabled={pending}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">{locale === 'en' ? 'Image' : '이미지'}</SelectItem>
                <SelectItem value="text">{locale === 'en' ? 'Text' : '텍스트'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'image' && (
            <div className="space-y-1.5">
              <Label htmlFor="upload-file">{locale === 'en' ? 'Image file' : '이미지 파일'}</Label>
              <Input
                id="upload-file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={pending}
                className="file:mr-2 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-0.5 file:text-xs file:text-secondary-foreground"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="upload-desc">{t('body')}</Label>
            <Textarea
              id="upload-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={pending}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="upload-publish" className="text-sm">
              {t('publicBadge')}
            </Label>
            <Switch id="upload-publish" checked={publish} onCheckedChange={setPublish} disabled={pending} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {t('cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={pending || !title.trim()}>
            {pending ? t('loading') : t('publish')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

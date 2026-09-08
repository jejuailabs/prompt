'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Loader2, Plus, Store } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { useSession } from '@/hooks/use-session';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/shared/empty-state';
import { PreviewRenderer } from '@/components/shared/preview-renderer';
import { ViewHeader } from '@/components/shared/view-header';
import type { BidDTO, BriefDTO, ListingDTO, ArtifactDTO, Locale, StructuredSpec } from '@/lib/types';

// Detail responses may carry the full bids array (BriefWithRelations); list DTOs do not.
type BriefDetail = BriefDTO & { bids?: BidDTO[] };

// ─── formatting helpers ─────────────────────────────────────────────────────

const won = (n: number, locale: Locale) =>
  `₩${n.toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR')}`;

const fmtDate = (iso: string, locale: Locale) =>
  new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

// ─── view root ──────────────────────────────────────────────────────────────

export default function MarketView() {
  const t = useTranslations('market');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto w-full max-w-5xl"
    >
      <ViewHeader title={t('title')} subtitle={t('subtitle')} />
      <Tabs defaultValue="listings">
        <TabsList>
          <TabsTrigger value="listings">{t('tabListings')}</TabsTrigger>
          <TabsTrigger value="briefs">{t('tabBriefs')}</TabsTrigger>
        </TabsList>
        <TabsContent value="listings" className="mt-4">
          <ListingsTab />
        </TabsContent>
        <TabsContent value="briefs" className="mt-4">
          <BriefsTab />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// ─── revenue-model badge ────────────────────────────────────────────────────

function RevenueModelBadge({ listing }: { listing: ListingDTO }) {
  const t = useTranslations('market');
  const locale = useAppStore((s) => s.locale);
  if (listing.revenueModel === 'ad_share')
    return <Badge variant="secondary">{t('modelAdShare')}</Badge>;
  if (listing.revenueModel === 'paid')
    return (
      <Badge variant="outline">
        {t('modelPaid')}
        {listing.price ? ` ${won(listing.price, locale)}` : ''}
      </Badge>
    );
  return <Badge variant="outline">{t('modelFreemium')}</Badge>;
}

// ─── listings tab ───────────────────────────────────────────────────────────

function ListingsTab() {
  const t = useTranslations('market');
  const tc = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const navigate = useAppStore((s) => s.navigate);
  const requireLogin = useAppStore((s) => s.requireLogin);
  const session = useSession();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [artifactId, setArtifactId] = useState('');
  const [model, setModel] = useState<'ad_share' | 'paid' | 'freemium'>('ad_share');
  const [price, setPrice] = useState('');

  const listingsQ = useQuery({
    queryKey: ['listings'],
    queryFn: () => api.get<ListingDTO[]>('/api/marketplace/listings'),
  });

  const artifactsQ = useQuery({
    queryKey: ['artifacts', 'mine'],
    queryFn: () => api.get<ArtifactDTO[]>('/api/artifacts?scope=mine'),
    enabled: open && !!session,
  });

  const listedIds = new Set((listingsQ.data ?? []).map((l) => l.artifact.id));
  const candidates = (artifactsQ.data ?? [])
    .filter((a) => a.status === 'published' && !listedIds.has(a.id));

  const createM = useMutation({
    mutationFn: (body: { artifactId: string; revenueModel: string; price?: number }) =>
      api.post<ListingDTO>('/api/marketplace/listings', body),
    onSuccess: () => {
      toast({ title: t('listedToast') });
      setOpen(false);
      setArtifactId('');
      setPrice('');
      void qc.invalidateQueries({ queryKey: ['listings'] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: 'destructive' }),
  });

  const openListingDialog = () => {
    if (!requireLogin()) return;
    setOpen(true);
  };

  const submitListing = () => {
    if (!artifactId) return;
    createM.mutate({
      artifactId,
      revenueModel: model,
      price: model === 'paid' && price ? Number(price) : undefined,
    });
  };

  const listings = listingsQ.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={openListingDialog}>
          <Store className="size-4" />
          {t('listMyArtifacts')}
        </Button>
      </div>

      {listingsQ.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : listingsQ.isError ? (
        <EmptyState
          title={t('loadFailed')}
          action={
            <Button variant="outline" onClick={() => void listingsQ.refetch()}>
              {tc('retry')}
            </Button>
          }
        />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={<Store className="size-5" />}
          title={t('listEmpty')}
          description={t('listEmptyDesc')}
          action={
            <Button onClick={openListingDialog}>
              <Store className="size-4" />
              {t('listMyArtifacts')}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <Card
              key={listing.id}
              className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
              onClick={() => navigate('project', { id: listing.artifact.id })}
            >
              <div className="relative h-36 overflow-hidden bg-muted">
                <PreviewRenderer artifact={listing.artifact} className="h-full w-full" />
              </div>
              <div className="p-4">
                <p className="line-clamp-1 font-medium">{listing.artifact.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <RevenueModelBadge listing={listing} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  @{listing.listedBy.username} · {fmtDate(listing.createdAt, locale)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* listing dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('listingDialogTitle')}</DialogTitle>
            <DialogDescription>{t('listingDialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('artifactLabel')}</Label>
              {candidates.length === 0 && !artifactsQ.isLoading ? (
                <p className="text-xs text-muted-foreground">{t('noArtifacts')}</p>
              ) : (
                <Select value={artifactId} onValueChange={setArtifactId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('artifactPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('revenueModelLabel')}</Label>
              <Select value={model} onValueChange={(v) => setModel(v as typeof model)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ad_share">{t('modelAdShare')}</SelectItem>
                  <SelectItem value="paid">{t('modelPaid')}</SelectItem>
                  <SelectItem value="freemium">{t('modelFreemium')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {model === 'paid' && (
              <div className="space-y-2">
                <Label>{t('priceLabel')}</Label>
                <Input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={t('pricePlaceholder')}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={submitListing} disabled={!artifactId || createM.isPending}>
              {createM.isPending && <Loader2 className="size-4 animate-spin" />}
              {t('submitListing')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── brief status badge ─────────────────────────────────────────────────────

function BriefStatusBadge({ status }: { status: BriefDTO['status'] }) {
  const t = useTranslations('market');
  switch (status) {
    case 'draft':
      return <Badge variant="outline">{t('statusDraft')}</Badge>;
    case 'submitted':
      return <Badge variant="secondary">{t('statusSubmitted')}</Badge>;
    case 'approved':
      return (
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">
          {t('statusApproved')}
        </Badge>
      );
    case 'matched':
      return (
        <Badge variant="outline" className="border-primary/40 text-primary">
          {t('statusMatched')}
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="outline" className="border-red-500/40 text-red-500">
          {t('statusRejected')}
        </Badge>
      );
  }
}

// ─── brief card ─────────────────────────────────────────────────────────────

function BriefCard({ brief, onDetail }: { brief: BriefDTO; onDetail: () => void }) {
  const t = useTranslations('market');
  const locale = useAppStore((s) => s.locale);
  const budget = brief.budget ?? brief.structuredSpec.suggestedBudgetKrw;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <BriefStatusBadge status={brief.status} />
        <Button size="sm" variant="outline" className="ml-auto h-7 px-2.5 text-xs" onClick={onDetail}>
          {t('viewDetail')}
        </Button>
      </div>
      <p className="mt-2 font-semibold">{brief.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        @{brief.author.username} · {won(budget, locale)} ·{' '}
        {t('bidsCount', { n: brief.bidCount })}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {brief.structuredSpec.features.slice(0, 3).map((f, i) => (
          <Badge key={i} variant="secondary" className="max-w-full text-xs font-normal">
            <span className="line-clamp-1">{f}</span>
          </Badge>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {t('specEffort')} {brief.structuredSpec.effortWeeks}
        {t('weeks')} · {t('specBudget')} {won(budget, locale)}
      </p>
    </Card>
  );
}

// ─── briefs tab ─────────────────────────────────────────────────────────────

function BriefsTab() {
  const t = useTranslations('market');
  const tc = useTranslations('core');
  const requireLogin = useAppStore((s) => s.requireLogin);
  const session = useSession();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [rawText, setRawText] = useState('');
  const [draft, setDraft] = useState<BriefDTO | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const openQ = useQuery({
    queryKey: ['briefs', 'open'],
    queryFn: () => api.get<BriefDTO[]>('/api/briefs?scope=open'),
  });

  const mineQ = useQuery({
    queryKey: ['briefs', 'mine'],
    queryFn: () => api.get<BriefDTO[]>('/api/briefs?scope=mine'),
    enabled: !!session,
  });

  const createM = useMutation({
    mutationFn: (body: { rawText: string }) => api.post<BriefDTO>('/api/briefs', body),
    onSuccess: (brief) => {
      setDraft(brief);
      setStep('review');
    },
    onError: (e: Error) => toast({ title: e.message, variant: 'destructive' }),
  });

  const submitM = useMutation({
    mutationFn: (id: string) => api.post<BriefDTO>(`/api/briefs/${id}/submit`),
    onSuccess: () => {
      toast({ title: t('submittedToast') });
      setDialogOpen(false);
      setDraft(null);
      setRawText('');
      setStep('input');
      void qc.invalidateQueries({ queryKey: ['briefs'] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: 'destructive' }),
  });

  const openNewBrief = () => {
    if (!requireLogin()) return;
    setStep('input');
    setDraft(null);
    setDialogOpen(true);
  };

  const openBriefs = openQ.data ?? [];
  const myBriefs = mineQ.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openNewBrief}>
          <Plus className="size-4" />
          {t('briefsNew')}
        </Button>
      </div>

      {/* open briefs */}
      <section className="space-y-3">
        <h2 className="font-semibold">{t('openBriefs')}</h2>
        {openQ.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : openQ.isError ? (
          <EmptyState
            title={t('loadFailed')}
            action={
              <Button variant="outline" onClick={() => void openQ.refetch()}>
                {tc('retry')}
              </Button>
            }
          />
        ) : openBriefs.length === 0 ? (
          <EmptyState title={t('briefsEmpty')} description={t('briefsEmptyDesc')} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {openBriefs.map((brief) => (
              <BriefCard key={brief.id} brief={brief} onDetail={() => setDetailId(brief.id)} />
            ))}
          </div>
        )}
      </section>

      {/* my briefs */}
      {session && (
        <section className="space-y-3">
          <h2 className="font-semibold">{t('myBriefs')}</h2>
          {mineQ.isLoading ? (
            <Skeleton className="h-44 rounded-xl" />
          ) : myBriefs.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">{t('myBriefsEmpty')}</Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {myBriefs.map((brief) => (
                <BriefCard key={brief.id} brief={brief} onDetail={() => setDetailId(brief.id)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* new brief dialog (2-step) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          {step === 'input' ? (
            <>
              <DialogHeader>
                <DialogTitle>{t('briefDialogTitle')}</DialogTitle>
                <DialogDescription>{t('briefStepADesc')}</DialogDescription>
              </DialogHeader>
              <Textarea
                rows={5}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={t('briefPlaceholder')}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {tc('cancel')}
                </Button>
                <Button
                  disabled={!rawText.trim() || createM.isPending}
                  onClick={() => createM.mutate({ rawText: rawText.trim() })}
                >
                  {createM.isPending && <Loader2 className="size-4 animate-spin" />}
                  {t('briefsNew')}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t('structuringTitle')}</DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
                {draft && <SpecView spec={draft.structuredSpec} />}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setDraft(null);
                    setRawText('');
                    setStep('input');
                  }}
                >
                  {tc('close')}
                </Button>
                <Button
                  disabled={!draft || submitM.isPending}
                  onClick={() => draft && submitM.mutate(draft.id)}
                >
                  {submitM.isPending && <Loader2 className="size-4 animate-spin" />}
                  {t('submitBrief')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* detail dialog */}
      <BriefDetailDialog briefId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

// ─── structured spec rendering ──────────────────────────────────────────────

function SpecView({ spec }: { spec: StructuredSpec }) {
  const t = useTranslations('market');
  const locale = useAppStore((s) => s.locale);
  return (
    <div className="space-y-4 text-sm">
      <div>
        <h4 className="font-semibold">{spec.title}</h4>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{t('specProblem')}</p>
        <p className="mt-1 leading-relaxed">{spec.problem}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{t('specTargetUsers')}</p>
        <p className="mt-1 leading-relaxed">{spec.targetUsers}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{t('specFeatures')}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {spec.features.map((f, i) => (
            <Badge key={i} variant="secondary" className="text-xs font-normal">
              {f}
            </Badge>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{t('specTechStack')}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {spec.techStack.map((s, i) => (
            <Badge key={i} variant="outline" className="text-xs font-normal">
              {s}
            </Badge>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{t('specPages')}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {spec.pages.map((p, i) => (
            <Badge key={i} variant="outline" className="text-xs font-normal">
              {p}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-6">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{t('specEffort')}</p>
          <p className="mt-1 font-medium">
            {spec.effortWeeks}
            {t('weeks')}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{t('specBudget')}</p>
          <p className="mt-1 font-medium tabular-nums">
            {won(spec.suggestedBudgetKrw, locale)}
          </p>
        </div>
      </div>
      {spec.risks.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">{t('specRisks')}</p>
          <ul className="mt-1.5 space-y-1.5">
            {spec.risks.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span className="leading-relaxed">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── bid row ────────────────────────────────────────────────────────────────

function BidRow({
  bid,
  onMatch,
  canMatch,
}: {
  bid: BidDTO;
  onMatch?: () => void;
  canMatch?: boolean;
}) {
  const t = useTranslations('market');
  const locale = useAppStore((s) => s.locale);
  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">@{bid.developer.username}</p>
        <span className="ml-auto text-sm font-semibold tabular-nums">{won(bid.price, locale)}</span>
        <Badge variant="secondary" className="text-xs font-normal">
          {bid.etaDays}
          {t('daysUnit')}
        </Badge>
        {canMatch && (
          <Button size="sm" className="h-7 px-2.5 text-xs" onClick={onMatch}>
            {t('matchConfirm')}
          </Button>
        )}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{bid.proposal}</p>
    </div>
  );
}

// ─── contract block ─────────────────────────────────────────────────────────

function ContractBlock({ contract }: { contract: NonNullable<BriefDTO['match']>['contract'] }) {
  const t = useTranslations('market');
  if (!contract) return null;
  return (
    <Card className="bg-muted/40 p-4">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold">{t('contractTitle')}</h4>
        <Badge variant="outline" className="ml-auto">
          {contract.status}
        </Badge>
      </div>
      <div className="mt-3 flex gap-6 text-sm">
        <p>
          <span className="text-muted-foreground">{t('developerShare')}</span>{' '}
          <span className="font-semibold text-emerald-500">{contract.revenueShareTerms.developerShare}%</span>
        </p>
        <p>
          <span className="text-muted-foreground">{t('platformShare')}</span>{' '}
          <span className="font-semibold">{contract.revenueShareTerms.platformShare}%</span>
        </p>
      </div>
      <div className="mt-3">
        <p className="text-xs font-medium text-muted-foreground">{t('milestones')}</p>
        <ul className="mt-1.5 space-y-1.5">
          {contract.revenueShareTerms.milestones.map((m, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {i + 1}
              </span>
              <span>{m}</span>
            </li>
          ))}
        </ul>
      </div>
      {contract.revenueShareTerms.notes && (
        <p className="mt-3 text-sm text-muted-foreground">{contract.revenueShareTerms.notes}</p>
      )}
    </Card>
  );
}

// ─── brief detail dialog ────────────────────────────────────────────────────

function BriefDetailDialog({ briefId, onClose }: { briefId: string | null; onClose: () => void }) {
  const t = useTranslations('market');
  const tc = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const requireLogin = useAppStore((s) => s.requireLogin);
  const session = useSession();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [proposal, setProposal] = useState('');
  const [price, setPrice] = useState('');
  const [etaDays, setEtaDays] = useState('14');

  const briefQ = useQuery({
    queryKey: ['brief', briefId],
    queryFn: () => api.get<BriefDetail>(`/api/briefs/${briefId}`),
    enabled: !!briefId,
  });

  const bidM = useMutation({
    mutationFn: (body: { proposal: string; price: number; etaDays: number }) =>
      api.post<BidDTO>(`/api/briefs/${briefId}/bids`, body),
    onSuccess: () => {
      toast({ title: t('bidToast') });
      setProposal('');
      setPrice('');
      void qc.invalidateQueries({ queryKey: ['brief', briefId] });
      void qc.invalidateQueries({ queryKey: ['briefs'] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: 'destructive' }),
  });

  const matchM = useMutation({
    mutationFn: (bidId: string) => api.post<BriefDTO>(`/api/briefs/${briefId}/match`, { bidId }),
    onSuccess: () => {
      toast({ title: t('matchToast') });
      void qc.invalidateQueries({ queryKey: ['briefs'] });
      void qc.invalidateQueries({ queryKey: ['brief', briefId] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: 'destructive' }),
  });

  const submitBid = () => {
    if (!requireLogin()) return;
    if (!proposal.trim() || !price) return;
    bidM.mutate({ proposal: proposal.trim(), price: Number(price), etaDays: Number(etaDays) || 14 });
  };

  const brief = briefQ.data;
  const isAuthor = !!session && !!brief && brief.author.id === session.id;
  const canBid =
    !!brief && brief.status === 'approved' && !!session && session.id !== brief.author.id;
  const bids = brief?.bids ?? [];
  const showMatchButtons = isAuthor && brief?.status === 'approved' && bids.length > 0;

  return (
    <Dialog open={!!briefId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        {briefQ.isLoading || !brief ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-7 w-2/3 rounded-md" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2 pr-6">
                <BriefStatusBadge status={brief.status} />
                <p className="text-xs text-muted-foreground">
                  @{brief.author.username} · {fmtDate(brief.createdAt, locale)}
                </p>
              </div>
              <DialogTitle>{brief.title}</DialogTitle>
              <DialogDescription className="line-clamp-2">{brief.rawText}</DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <SpecView spec={brief.structuredSpec} />

              {/* matched → contract */}
              {brief.status === 'matched' && brief.match && (
                <div className="space-y-3">
                  <ContractBlock contract={brief.match.contract} />
                  {brief.match.bid && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">{t('winnerBid')}</p>
                      <BidRow bid={brief.match.bid} />
                    </div>
                  )}
                </div>
              )}

              {/* approved → bids + bid form / matching */}
              {brief.status === 'approved' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">{t('bidList')}</h4>
                    <Badge variant="secondary" className="text-xs font-normal">
                      {t('bidsCount', { n: brief.bidCount })}
                    </Badge>
                  </div>

                  {bids.length > 0 ? (
                    <div className="space-y-2">
                      {bids.map((bid) => (
                        <BidRow
                          key={bid.id}
                          bid={bid}
                          canMatch={showMatchButtons}
                          onMatch={() => matchM.mutate(bid.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('noBids')}</p>
                  )}

                  {canBid && (
                    <div className="space-y-3 rounded-lg border p-4">
                      <h4 className="text-sm font-semibold">{t('bidFormTitle')}</h4>
                      <div className="space-y-2">
                        <Label>{t('proposalLabel')}</Label>
                        <Textarea
                          rows={3}
                          value={proposal}
                          onChange={(e) => setProposal(e.target.value)}
                          placeholder={t('proposalPlaceholder')}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>{t('bidPriceLabel')}</Label>
                          <Input
                            type="number"
                            min={0}
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('bidEtaLabel')}</Label>
                          <Input
                            type="number"
                            min={1}
                            value={etaDays}
                            onChange={(e) => setEtaDays(e.target.value)}
                          />
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        onClick={submitBid}
                        disabled={!proposal.trim() || !price || bidM.isPending}
                      >
                        {bidM.isPending && <Loader2 className="size-4 animate-spin" />}
                        {t('bidSubmit')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                {tc('close')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

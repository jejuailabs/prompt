'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
export function CreditRequests() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'credit-requests'], queryFn: () => api.get<{ id: string; user: { username: string }; createdAt: string }[]>('/api/admin/credit-requests'), refetchInterval: 15000 });
  const m = useMutation({ mutationFn: (body: { id: string; action: string }) => api.post('/api/admin/credit-requests', body), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['admin'] }); } });
  return <section className="mb-5 rounded-xl border p-4"><h2 className="font-semibold">500크레딧 충전 승인</h2><p className="text-sm text-muted-foreground">승인 시에만 지급됩니다. 결제가 아닙니다.</p>{q.isLoading && <p>불러오는 중…</p>}{(q.isError || m.isError) && <p role="alert">요청 처리 실패: {(q.error || m.error)?.message}</p>}{q.data?.length === 0 && <p className="mt-3 text-sm">대기 중인 요청이 없습니다.</p>}{q.data?.map(r => <div key={r.id} className="mt-3 flex items-center gap-3 border-t pt-3"><span className="flex-1">{r.user.username} · 500크레딧 · {new Date(r.createdAt).toLocaleString()}</span><Button disabled={m.isPending} onClick={() => m.mutate({ id: r.id, action: 'approve' })}>승인</Button><Button variant="outline" disabled={m.isPending} onClick={() => m.mutate({ id: r.id, action: 'reject' })}>거절</Button></div>)}</section>;
}

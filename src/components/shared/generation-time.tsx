export function GenerationTime({ executionTime, delayTime, detailed = false }: { executionTime?: number; delayTime?: number; detailed?: boolean }) {
  const valid = (value: number | undefined): value is number => value != null && Number.isFinite(value) && value >= 0;
  if (!valid(executionTime)) return <span className="text-xs text-muted-foreground">생성 시간 기록 없음 · 저장된 시간 데이터가 없습니다.</span>;
  const format = (ms: number) => { const sec = Math.round(ms / 1000); return `${Math.floor(sec / 60)}분 ${sec % 60}초`; };
  if (detailed) return <dl className="space-y-1.5 text-sm"><div className="flex justify-between gap-2"><dt>생성 처리</dt><dd className="font-semibold tabular-nums">{format(executionTime)}</dd></div><div className="flex justify-between gap-2"><dt>워커 준비·대기</dt><dd className="tabular-nums">{valid(delayTime) ? format(delayTime) : '기록 없음'}</dd></div><div className="flex justify-between gap-2 border-t pt-1.5"><dt>대기 포함 합계</dt><dd className="font-semibold tabular-nums">{valid(delayTime) ? format(executionTime + delayTime) : '확인 불가'}</dd></div></dl>;
  return <span className="text-xs text-muted-foreground">생성 처리 {format(executionTime)}{valid(delayTime) && ` · 대기 ${format(delayTime)} · 합계 ${format(executionTime + delayTime)}`}</span>;
}

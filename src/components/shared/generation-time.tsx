export function GenerationTime({ executionTime, delayTime }: { executionTime?: number; delayTime?: number }) {
  if (executionTime == null || !Number.isFinite(executionTime)) return <span className="text-xs text-muted-foreground">처리시간 기록 없음</span>;
  const format = (ms: number) => { const sec = Math.round(ms / 1000); return `${Math.floor(sec / 60)}분 ${sec % 60}초`; };
  return <span className="text-xs text-muted-foreground">생성 처리 {format(executionTime)}{delayTime != null && ` · 대기 ${format(delayTime)} · 합계 ${format(executionTime + delayTime)}`}</span>;
}

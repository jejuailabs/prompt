export const FISH = [
  { name:'은빛 정어리', points:80, rarity:'COMMON' },
  { name:'주황 흰동가리', points:110, rarity:'COMMON' },
  { name:'노랑 나비고기', points:150, rarity:'UNCOMMON' },
  { name:'보랏빛 엔젤', points:210, rarity:'RARE' },
  { name:'동글 복어', points:260, rarity:'RARE' },
  { name:'노을빛 금붕어', points:400, rarity:'LEGENDARY' },
];
export function judgeCatch(position, center, width) {
  const distance = Math.abs(position-center);
  if(distance>width/2)return 'miss';
  return distance<=width*.16?'perfect':'good';
}
export function catchPoints(fishIndex, judgement, streak) {
  if(judgement==='miss')return 0;
  return Math.round(FISH[fishIndex].points*(judgement==='perfect'?1.8:1)*(1+Math.min(Math.max(streak-1,0),5)*.15));
}

import {shuffle} from './runtime.mjs';
export const cardValue=c=>c.rank==='A'?11:['K','Q','J'].includes(c.rank)?10:Number(c.rank);
export function total(cards){let value=cards.reduce((s,c)=>s+cardValue(c),0),aces=cards.filter(c=>c.rank==='A').length;while(value>21&&aces-- >0)value-=10;return{value,soft:aces>0};}
export const natural=cards=>cards.length===2&&total(cards).value===21;
export function shoe(rng=Math.random){return shuffle(Array.from({length:6},()=>['♠','♥','♦','♣'].flatMap(suit=>['A','2','3','4','5','6','7','8','9','10','J','Q','K'].map(rank=>({rank,suit})))).flat(),rng);}
export function payout(hand,dealer){const p=total(hand.cards).value,d=total(dealer).value;if(hand.surrender)return hand.bet/2;if(p>21)return 0;if(natural(dealer))return natural(hand.cards)&&!hand.split?hand.bet:0;if(natural(hand.cards)&&!hand.split)return hand.bet*2.5;if(d>21||p>d)return hand.bet*2;if(p===d)return hand.bet;return 0;}

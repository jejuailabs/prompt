export const COLS=7,ROWS=8,TURN_LIMIT=25,COLORS=5,STAR=5;
const neighbors=i=>[i%COLS?i-1:-1,i%COLS<COLS-1?i+1:-1,i>=COLS?i-COLS:-1,i<(ROWS-1)*COLS?i+COLS:-1].filter(x=>x>=0);
export function connected(board,index) {
  if(index<0||index>=board.length)return [];
  if(board[index]===STAR){const seen=new Set([index]),queue=[index];for(let n=0;n<queue.length;n++){const p=queue[n],r=Math.floor(p/COLS),c=p%COLS;for(let y=Math.max(0,r-1);y<=Math.min(ROWS-1,r+1);y++)for(let x=Math.max(0,c-1);x<=Math.min(COLS-1,c+1);x++){const q=y*COLS+x;if(!seen.has(q)){seen.add(q);if(board[q]===STAR)queue.push(q);}}}return [...seen];}
  const seen=new Set([index]),queue=[index];for(let n=0;n<queue.length;n++)for(const next of neighbors(queue[n]))if(!seen.has(next)&&board[next]===board[index]){seen.add(next);queue.push(next);}return [...seen];
}
export function hasMove(board){return board.some((color,i)=>color===STAR||neighbors(i).some(n=>board[n]===color));}
export function randomBoard(rng=Math.random){const board=Array.from({length:COLS*ROWS},()=>Math.floor(rng()*COLORS));if(!hasMove(board))board[1]=board[0];return board;}
export function playTurn(state,index,rng=Math.random){
  if(state.moves<=0)return {state,valid:false,popped:[]};
  const popped=connected(state.board,index);if(popped.length<2)return {state,valid:false,popped:[]};
  const color=state.board[index],combo=color===state.lastColor?Math.min(4,state.combo+1):1;
  const bonus=color===state.orderColor?popped.length*25:0,points=popped.length*popped.length*10+bonus+(combo-1)*40;
  const hit=new Set(popped),board=Array(COLS*ROWS);
  for(let c=0;c<COLS;c++){const remaining=[];for(let r=ROWS-1;r>=0;r--)if(!hit.has(r*COLS+c))remaining.push(state.board[r*COLS+c]);for(let r=ROWS-1,n=0;r>=0;r--,n++)board[r*COLS+c]=remaining[n]??Math.floor(rng()*COLORS);}
  if(popped.length>=7&&color!==STAR)board[index%COLS]=STAR;
  let reshuffled=false;if(!hasMove(board)){for(let i=board.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[board[i],board[j]]=[board[j],board[i]];}if(!hasMove(board))board[1]=board[0];reshuffled=true;}
  const turns=TURN_LIMIT-state.moves+1;
  return {valid:true,popped,points,bonus,reshuffled,state:{...state,board,score:state.score+points,moves:state.moves-1,combo,lastColor:color,orderColor:turns%5===0?(state.orderColor+1)%COLORS:state.orderColor,largest:Math.max(state.largest,popped.length)}};
}
export function newGarden(rng=Math.random){return {board:randomBoard(rng),score:0,moves:TURN_LIMIT,combo:0,lastColor:-1,orderColor:Math.floor(rng()*COLORS),largest:0};}

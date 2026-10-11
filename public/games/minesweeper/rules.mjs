import {shuffle} from './runtime.mjs';
export const LEVELS={beginner:{cols:9,rows:9,mines:10},intermediate:{cols:16,rows:16,mines:40},expert:{cols:30,rows:16,mines:99}};
export class Board{
 constructor(cols,rows,mines,rng=Math.random){this.cols=cols;this.rows=rows;this.mines=mines;this.rng=rng;this.cells=Array.from({length:cols*rows},()=>({mine:false,number:0,open:false,flag:0}));this.placed=false;this.state='waiting';this.exploded=-1;}
 around(i){const x=i%this.cols,y=Math.floor(i/this.cols),a=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&x+dx>=0&&x+dx<this.cols&&y+dy>=0&&y+dy<this.rows)a.push((y+dy)*this.cols+x+dx);return a;}
 place(first){for(const i of shuffle(this.cells.map((_,i)=>i).filter(i=>i!==first),this.rng).slice(0,this.mines))this.cells[i].mine=true;for(let i=0;i<this.cells.length;i++)this.cells[i].number=this.around(i).filter(j=>this.cells[j].mine).length;this.placed=true;this.state='playing';}
 flag(i,questions=true){const c=this.cells[i];if(!c||c.open||['won','lost'].includes(this.state))return;c.flag=questions?(c.flag+1)%3:c.flag===1?0:1;}
 reveal(i){const c=this.cells[i];if(!c||c.open||c.flag===1||['won','lost'].includes(this.state))return false;if(!this.placed)this.place(i);if(c.mine){c.open=true;this.exploded=i;this.state='lost';return true;}const queue=[i];while(queue.length){const j=queue.pop(),v=this.cells[j];if(v.open||v.flag===1||v.mine)continue;v.open=true;v.flag=0;if(v.number===0)queue.push(...this.around(j).filter(k=>!this.cells[k].open));}if(this.cells.every(v=>v.mine||v.open)){this.state='won';for(const v of this.cells)if(v.mine)v.flag=1;}return true;}
 chord(i){const c=this.cells[i];if(!c?.open||c.mine||this.state!=='playing')return false;const a=this.around(i);if(a.filter(j=>this.cells[j].flag===1).length!==c.number)return false;for(const j of a){this.reveal(j);if(this.state==='lost')break;}return true;}
 get flags(){return this.cells.filter(c=>c.flag===1).length;}
}
export const timeScore=seconds=>Math.max(1,100000000-Math.min(86400000,Math.floor(seconds*1000)));

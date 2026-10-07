export function judgeStack(previous,x,streak=0){
  const delta=x-previous.x,perfect=Math.abs(delta)<=5,overlap=Math.max(0,Math.min(previous.x+previous.width,x+previous.width)-Math.max(previous.x,x));
  if(!overlap)return {hit:false,perfect:false,points:0,streak:0};
  const nextStreak=perfect?streak+1:0;
  let width=perfect?previous.width:overlap,left=perfect?previous.x:Math.max(previous.x,x);
  const restored=perfect&&nextStreak%3===0?Math.min(12,250-width):0;
  width+=restored;left-=restored/2;left=Math.max(8,Math.min(392-width,left));
  return {hit:true,perfect,width,x:left,streak:nextStreak,restored,points:Math.round(30+70*overlap/previous.width)+(perfect?60+Math.min(nextStreak,10)*20:0),cut:perfect?null:delta>0?{x:left+overlap,width:previous.width-overlap}:{x,width:previous.width-overlap}};
}
export function flightFor(height,rng=Math.random){return {speed:105+Math.min(105,height*3)+rng()*35,wobble:height<4?0:8+rng()*20,phase:rng()*Math.PI*2,fromLeft:height%2===0};}

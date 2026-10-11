export function cutStack(top,moving,axis,tolerance=.045){
 if(!['x','z'].includes(axis))throw new Error('Invalid stacking axis');
 const dimension=axis==='x'?'width':'depth',size=top[dimension],delta=moving[axis]-top[axis];
 if(Math.abs(delta)>=size)return{hit:false,perfect:false};
 const perfect=Math.abs(delta)<=Math.min(tolerance,size*.12);
 const left=Math.max(top[axis]-size/2,moving[axis]-size/2),right=Math.min(top[axis]+size/2,moving[axis]+size/2);
 const next={x:top.x,z:top.z,width:top.width,depth:top.depth};
 if(!perfect){next[dimension]=right-left;next[axis]=(left+right)/2;}
 const cut=perfect?null:{x:moving.x,z:moving.z,width:top.width,depth:top.depth};
 if(cut){cut[dimension]=Math.abs(delta);cut[axis]=delta>0?right+Math.abs(delta)/2:left-Math.abs(delta)/2;}
 return{hit:true,perfect,next,cut,delta};
}
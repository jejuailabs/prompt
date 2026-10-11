export const STAGE_TWO_START=184;
export function stageAt(z){return z>=STAGE_TWO_START?2:1;}
export function bankAt(track,z){const a=track.bankStart??track.bank??0,b=track.bankEnd??a,t=Math.max(0,Math.min(1,(z-track.start)/(track.end-track.start)));return a+(b-a)*t;}
export function trackHeight(track,z,x=track.x){return track.y-(z-track.start)*track.slope+(x-track.x)*bankAt(track,z);}
export function surfaceAt(tracks,x,z,radius=.5){return tracks.find(t=>z>=t.start&&z<=t.end&&Math.abs(x-t.x)<=t.width/2-radius*.25)||null;}
export function sphereBoxHit(p,r,b){const x=Math.max(b.x-b.width/2,Math.min(p.x,b.x+b.width/2)),y=Math.max(b.y,Math.min(p.y,b.y+b.height)),z=Math.max(b.z-b.depth/2,Math.min(p.z,b.z+b.depth/2));return(p.x-x)**2+(p.y-y)**2+(p.z-z)**2<=r*r;}
export function sphereEllipsoidHit(p,r,center,radii){
 const q=[p.x-center.x,p.y-center.y,p.z-center.z],a=[radii.x,radii.y,radii.z];
 if(q.reduce((sum,v,i)=>sum+(v/a[i])**2,0)<=1)return true;
 let lo=0,hi=Math.max(...a)*Math.hypot(...q);
 for(let i=0;i<24;i++){const t=(lo+hi)/2,sum=q.reduce((sum,v,j)=>sum+(a[j]*v/(t+a[j]*a[j]))**2,0);if(sum>1)lo=t;else hi=t;}
 const t=(lo+hi)/2;return q.reduce((sum,v,i)=>sum+(v-a[i]*a[i]*v/(t+a[i]*a[i]))**2,0)<=r*r;
}
export function hazardHit(p,r,b){
 const part=(y,xRadius,yRadius,zRadius)=>sphereEllipsoidHit(p,r,{x:b.x,y:b.y+y,z:b.z},{x:xRadius,y:yRadius,z:zRadius});
 if(b.kind==='mallow')return part(.32,.80,.30,.50)||part(.52,.55,.10,.37);
 if(b.kind==='mushroom')return part(.35,.26,.35,.26)||part(.79,.72,.34,.67);
 return sphereBoxHit(p,r,b);
}
export function jumpBall(ball){if(!ball.grounded)return false;ball.grounded=false;ball.vy=10.5;return true;}
export function advanceBall(ball,tracks,obstacles,input,dt){
 const previousY=ball.y,previousTrack=surfaceAt(tracks,ball.x,ball.z,ball.radius);
 ball.vx+=(input*(7.4+ball.speed*.085)-ball.vx)*(1-Math.exp(-9*dt));
 if(ball.grounded&&previousTrack){const bank=bankAt(previousTrack,ball.z);ball.vx-=22*bank/(1+bank*bank)*dt;}
 ball.x+=ball.vx*dt;ball.z+=ball.speed*dt;
 const track=surfaceAt(tracks,ball.x,ball.z,ball.radius),floor=track?trackHeight(track,ball.z,ball.x)+ball.radius:null;
 if(ball.grounded&&track&&Math.abs(ball.y-floor)<.7){ball.y=floor;const bankChange=((track.bankEnd??track.bankStart??0)-(track.bankStart??0))/(track.end-track.start);ball.vy=(-track.slope+(ball.x-track.x)*bankChange)*ball.speed+bankAt(track,ball.z)*ball.vx;}else{ball.grounded=false;ball.vy-=22*dt;ball.y+=ball.vy*dt;if(track&&ball.y<=floor&&previousY>=floor&&ball.vy<0){ball.y=floor;ball.vy=-track.slope*ball.speed;ball.grounded=true;}}
 for(const obstacle of obstacles)if(Math.abs(obstacle.z-ball.z)<3&&hazardHit(ball,ball.radius*.88,obstacle))return'collision';
 const nearest=tracks.find(t=>ball.z>=t.start&&ball.z<=t.end)||tracks.find(t=>t.start>ball.z);
 if(ball.y<(nearest?trackHeight(nearest,ball.z,ball.x):-1000)-7||Math.abs(ball.x)>25)return'fall';return null;
}

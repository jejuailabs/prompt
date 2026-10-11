const fs=require('node:fs'),path=require('node:path');const source=path.resolve('public/games/fonts');
function install(dir){fs.cpSync(source,path.join(dir,'fonts'),{recursive:true});}
function dependencies(){return ['Pretendard','Fredoka','Cinzel'].map(name=>({name,license:'OFL-1.1',files:['fonts/'+(name==='Pretendard'?'PretendardVariable.woff2':name+'.ttf'),'fonts/'+(name==='Pretendard'?'Pretendard-LICENSE.txt':name+'-OFL.txt')]}));}
module.exports={install,dependencies};

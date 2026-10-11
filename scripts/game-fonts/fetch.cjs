const fs=require('node:fs'),crypto=require('node:crypto');const root='public/games/fonts';const items=[
 ['PretendardVariable.woff2','https://raw.githubusercontent.com/orioncactus/pretendard/main/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2'],
 ['Pretendard-LICENSE.txt','https://raw.githubusercontent.com/orioncactus/pretendard/main/LICENSE'],
 ['Fredoka.ttf','https://raw.githubusercontent.com/google/fonts/main/ofl/fredoka/Fredoka%5Bwdth,wght%5D.ttf'],
 ['Fredoka-OFL.txt','https://raw.githubusercontent.com/google/fonts/main/ofl/fredoka/OFL.txt'],
 ['Cinzel.ttf','https://raw.githubusercontent.com/google/fonts/main/ofl/cinzel/Cinzel%5Bwght%5D.ttf'],
 ['Cinzel-OFL.txt','https://raw.githubusercontent.com/google/fonts/main/ofl/cinzel/OFL.txt']];
(async()=>{fs.mkdirSync(root,{recursive:true});const receipts=await Promise.all(items.map(async([file,url])=>{const r=await fetch(url);if(!r.ok)throw Error(file+': '+r.status);const b=Buffer.from(await r.arrayBuffer());fs.writeFileSync(root+'/'+file,b);return{file,source:url,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')};}));fs.writeFileSync(root+'/sources.json',JSON.stringify({retrievedAt:new Date().toISOString(),license:'SIL Open Font License 1.1',files:receipts},null,2)+'\n');console.log(receipts.map(r=>r.file+' '+r.bytes+' bytes').join('\n'));})().catch(e=>{console.error(e);process.exitCode=1;});

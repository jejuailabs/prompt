// Concept cover art for the FunJeju Motion Library.
// Original SVG illustrations of each effect, not renders of the source Remotion scenes.
// Ported from the local FunJeju Motion Library (covers.js + app.js createArtwork).

let coverSerial = 0;

function paintSemanticCover(svg, item, palette) {
  'use strict';
  const [bg, ink, accent, paper] = palette;
  const NS='http://www.w3.org/2000/svg';
  const uid = 'cover-' + (++coverSerial);
  const add=(tag, attrs, value, parent=svg)=>{const node=document.createElementNS(NS,tag);Object.entries(attrs||{}).forEach(([k,v])=>node.setAttribute(k,String(v)));if(value!==undefined)node.textContent=value;parent.append(node);return node;};
  const group=(attrs)=>add('g',attrs);
  const rect=(x,y,w,h,fill=ink,rx=0,more={})=>add('rect',{x,y,width:w,height:h,fill,rx,...more});
  const circle=(cx,cy,r,fill=accent,more={})=>add('circle',{cx,cy,r,fill,...more});
  const path=(d,stroke=ink,width=2,more={})=>add('path',{d,stroke,'stroke-width':width,fill:'none','stroke-linecap':'round','stroke-linejoin':'round',...more});
  const txt=(x,y,value,size=20,fill=ink,more={})=>add('text',{x,y,fill,'font-size':size,'font-family':'Arial, sans-serif',...more},value);
  const line=(x1,y1,x2,y2,stroke=ink,width=2,more={})=>add('line',{x1,y1,x2,y2,stroke,'stroke-width':width,...more});
  const label=(text)=>txt(42,79,text,11,ink,{'letter-spacing':3});
  const face=(x,y,r=44,fill=accent,more={})=>{circle(x,y,r,fill,more);circle(x-r*.29,y-r*.1,3,ink);circle(x+r*.29,y-r*.1,3,ink);path(`M${x-r*.26} ${y+r*.2}q${r*.26} ${r*.25} ${r*.52} 0`,ink,3);};
  const bottle=(x,y,w=67,h=134,fill=accent)=>{rect(x,y,w,h,fill,13);rect(x+w*.19,y-20,w*.62,25,ink,4);rect(x+7,y+10,4,h-30,paper,2,{opacity:.35});circle(x+w/2,y+h*.47,w*.25,paper);txt(x+w/2,y+h*.47+5,'FJ',w*.2,ink,{'font-weight':700,'text-anchor':'middle'});};
  const arrow=(x,y,direction=1)=>{path(`M${x} ${y}h${direction*42}m${-direction*12} -10 ${direction*12} 10 ${-direction*12} 10`,ink,3);};
  const cursor=(x,y)=>path(`M${x} ${y}l5 47 12-15 18 15 9-10-17-13 20-7z`,paper,3,{fill:ink,class:'art-float'});
  const play=(x,y,r=27)=>{circle(x,y,r,paper);path(`M${x-5} ${y-10}l17 10-17 10z`,ink,2,{fill:ink});};
  const waveform=(x,y,count=20)=>{for(let i=0;i<count;i++){const h=20+Math.sin(i*.55)**2*115;rect(x+i*18,y-h/2,8,h,i%3===0?accent:ink,4,{class:i%2?'art-pulse':'art-pulse art-delay'});}};
  const frame=(x=80,y=70,w=440,h=260)=>{rect(x,y,w,h,paper,9);rect(x,y,w,25,ink,9);rect(x,y+14,w,11,ink);[0,1,2].forEach(i=>circle(x+15+i*12,y+12,3,[accent,bg,paper][i]));};
  const cube=(x,y,s=80)=>{path(`M${x} ${y-s}l${s} ${s*.5}v${s}l-${s} ${s*.5}-${s}-${s*.5}v-${s}z`,ink,3,{fill:paper});path(`M${x-s} ${y-s*.5}l${s} ${s*.5} ${s}-${s*.5}M${x} ${y}v${s}`,ink,3);path(`M${x} ${y-s}l${s} ${s*.5}-${s} ${s*.5}-${s}-${s*.5}z`,ink,2,{fill:accent});};
  const timeline=(y)=>{line(80,y,520,y,ink,1,{opacity:.4});for(let i=0;i<9;i++)line(80+i*55,y,80+i*55,y+7,ink,1);};
  const is=(...ids)=>ids.includes(item.id);

  if(item.id==='51') return false; // Uses the original spotlight stage composition in app.js.
  if(item.id==='52'){
    label('THE NEXT IN LINE');line(60,306,545,306,ink,1,{opacity:.3});
    bottle(98,173,57,115,paper);bottle(258,124,84,174,accent);bottle(444,173,57,115,paper);
    arrow(172,219);arrow(371,219);rect(249,330,47,4,ink,2);rect(304,330,12,4,ink,2,{opacity:.3});rect(323,330,12,4,ink,2,{opacity:.3});
  }else if(item.id==='53'){
    label('A CLOSER LOOK');bottle(257,130,83,167,accent);
    [[278,146,183,112,'FORM'],[327,225,412,184,'DETAIL'],[280,282,177,305,'FINISH']].forEach(([x,y,tx,ty,t])=>{circle(x,y,4,ink);path(`M${x} ${y}L${tx} ${ty}h${tx<300?-65:70}`,ink,1.5);txt(tx+(tx<300?-65:4),ty-9,t,10,ink,{'letter-spacing':2});});
  }else if(item.id==='54'){
    label('MADE FOR PORTRAIT');rect(213,59,174,292,ink,25);rect(222,69,156,272,paper,20);rect(267,77,67,9,ink,5);txt(300,116,'ONE GOOD THING',10,ink,{'text-anchor':'middle','font-weight':700});bottle(268,151,63,130,accent);rect(249,306,103,15,ink,7);path('M148 96v209m-9-195 9-14 9 14m-18 181 9 14 9-14',ink,1.5);txt(115,205,'9:16',11,ink,{transform:'rotate(-90 115 205)'});
  }else if(item.id==='55'){
    label('A LITTLE MORE IMPACT');rect(85,146,252,133,paper,5,{transform:'rotate(-8 211 211)'});txt(112,207,'SPECIAL',18,ink,{'letter-spacing':3});txt(109,256,'₩ 29,000',31,ink,{'font-weight':700});circle(420,196,83,accent,{class:'art-pulse'});txt(420,188,'30%',43,ink,{'font-weight':800,'text-anchor':'middle'});txt(420,223,'OFF',20,ink,{'letter-spacing':5,'text-anchor':'middle'});path('M390 304h84m-10-9 10 9-10 9',ink,2);
  }else if(item.id==='56'){
    label('LET ME INTRODUCE');face(173,225,66,accent);rect(145,289,60,33,accent,18);bottle(364,158,71,145,paper);rect(202,99,231,57,paper,21);path('M218 149l-20 26 38-19',paper,2,{fill:paper});txt(317,135,'MEET YOUR NEXT FAVORITE',11,ink,{'text-anchor':'middle','font-weight':700});arrow(262,232);
  }else if(item.id==='57'){
    label('A LINEUP WITH DEPTH');[[85,223,110,65,55,111,paper],[241,171,123,134,72,151,accent],[410,238,101,56,54,104,paper]].forEach(([x,y,w,h,bw,bh,c])=>{rect(x,y,w,h,ink,1,{opacity:.8});add('ellipse',{cx:x+w/2,cy:y,rx:w/2,ry:14,fill:paper});bottle(x+(w-bw)/2,y-bh,bw,bh,c);});
  }else if(item.id==='41'){
    label('AN OPENING HELLO');face(216,240,78,accent,{class:'art-pulse'});rect(302,92,203,89,paper,28);path('M315 172l-26 35 57-31',paper,2,{fill:paper});txt(403,148,'HELLO!',31,ink,{'font-weight':800,'text-anchor':'middle'});path('M100 171l-12-14m17 5-4-21m-12 38-24-4',ink,3);
  }else if(item.id==='42'){
    label('A MOMENT OF BREATH');circle(305,224,91,ink,{opacity:.08});circle(305,224,113,'none',{stroke:ink,'stroke-width':1,'stroke-dasharray':'4 9',opacity:.35});face(305,224,76,accent,{class:'art-pulse'});path('M176 177q-25 48 0 96m261-96q25 48 0 96',ink,2);path('M166 179l10-4 5 11m252 78 4 12 12-3',ink,2);txt(300,348,'BREATHE IN / BREATHE OUT',10,ink,{'letter-spacing':2,'text-anchor':'middle'});
  }else if(item.id==='43'){
    label('TAKE A LITTLE LEAP');path('M82 293Q284 28 507 293',ink,2,{'stroke-dasharray':'5 9',opacity:.6});line(73,313,525,313,ink,1,{opacity:.4});face(110,285,25,paper);face(292,175,53,accent,{class:'art-float'});face(499,285,25,paper);path('M499 314l-11 17m19-17 11 17',ink,2);
  }else if(item.id==='44'){
    label('THREE LAYERS, ONE WORLD');circle(461,134,38,paper);path('M0 246q102-144 198-31t202-30 200 53v170H0Z',ink,0,{fill:ink,opacity:.22});path('M0 279q144-100 273-16t327-29v166H0Z',ink,0,{fill:ink,opacity:.38});path('M0 321q196-70 303-5t297-5v89H0Z',ink,0,{fill:ink});face(295,272,37,accent);arrow(97,146);arrow(138,200);arrow(66,264);
  }else if(item.id==='45'){
    label('MEET THE PERSON');rect(113,108,375,219,paper,12,{transform:'rotate(-4 300 217)'});circle(205,206,64,bg);face(205,204,43,accent);txt(297,169,'HELLO, I’M',11,ink,{'letter-spacing':2});txt(295,208,'CREATIVE',27,ink,{'font-weight':700});rect(298,228,115,5,ink,2,{opacity:.25});rect(298,242,84,5,ink,2,{opacity:.25});rect(295,272,113,22,ink,11);txt(351,287,'LET’S MAKE IT',9,paper,{'text-anchor':'middle'});
  }else if(item.id==='46'){
    label('CONNECTED BY IDEAS');[[138,143],[461,127],[100,283],[475,296]].forEach(([x,y])=>{line(301,223,x,y,ink,2,{opacity:.5});face(x,y,31,paper);});face(301,223,70,accent,{class:'art-pulse'});circle(221,182,5,ink);circle(389,264,5,ink);
  }else if(item.id==='47'){
    label('PEEL. PLACE. PLAY.');circle(308,216,104,ink,{opacity:.13});circle(301,203,99,paper);face(301,203,85,accent);path('M374 266q-3-31 34-36l-17 32z',ink,1,{fill:bg});txt(82,305,'STICK!',23,ink,{'font-weight':800,transform:'rotate(-13 82 305)'});path('M453 131l22-9m-26-2 10-20m-2 46 27 3',ink,3);
  }else if(item.id==='01a'){
    label('FROM FRAME TO FEELING');path('M89 99v222h440',ink,1.5);path('M91 318C131 318 161 119 203 148s34 96 74 59 28-32 61-12 25 14 61 5 58-1 97 0',accent,5);[[91,318],[203,148],[277,207],[398,200],[497,200]].forEach(([x,y],i)=>circle(x,y,i===1?12:5,i===1?accent:ink));txt(85,348,'FRAME',9,ink,{'letter-spacing':3});txt(508,348,'VALUE',9,ink,{'letter-spacing':3,'text-anchor':'end'});txt(392,132,'spring()',20,ink,{'font-family':'monospace'});
  }else if(item.id==='01b'){
    label('MAKE ROOM FOR TIME');timeline(125);[[95,156,178,accent,'SCENE 01'],[208,210,197,ink,'SCENE 02'],[343,264,164,paper,'LOOP']].forEach(([x,y,w,c,t])=>{rect(x,y,w,40,c,5);txt(x+13,y+25,t,12,c===ink?paper:ink,{'letter-spacing':1});});line(307,106,307,329,accent,2);path('M301 103h12l-6 9z',accent,1,{fill:accent});
  }else if(item.id==='01c'){
    label('MORE THAN ONE MEDIUM');rect(68,111,189,152,paper,9,{transform:'rotate(-8 163 187)'});circle(207,153,17,accent);path('M76 252l67-82 46 56 39-30 27 56z',ink,0,{fill:ink,opacity:.7});rect(233,151,202,147,ink,10);play(334,222);rect(386,93,145,82,accent,7);[0,1,2,3,4,5,6].forEach(i=>rect(405+i*16,118-Math.sin(i)*10,6,34+Math.sin(i)*20,ink,3));
  }else if(item.id==='02'){
    label('MEET THE NEXT SCENE');rect(74,111,222,189,ink,5);rect(296,111,229,189,paper,5);txt(179,231,'A',88,paper,{'font-weight':700,'text-anchor':'middle'});txt(413,231,'B',88,ink,{'font-weight':700,'text-anchor':'middle'});rect(289,92,13,228,accent,5,{class:'art-slide'});circle(296,205,30,accent);arrow(276,205);txt(300,344,'WIPE / SLIDE / FADE',10,ink,{'letter-spacing':3,'text-anchor':'middle'});
  }else if(item.id==='03'){
    label('LIGHT, CAUGHT IN THE FRAME');const defs=add('defs');const grad=add('radialGradient',{id:`leak-${uid}`},undefined,defs);add('stop',{offset:'0%','stop-color':'#fff3b8'},undefined,grad);add('stop',{offset:'42%','stop-color':'#ff924d','stop-opacity':'.9'},undefined,grad);add('stop',{offset:'100%','stop-color':'#ed493c','stop-opacity':'0'},undefined,grad);rect(75,104,450,220,ink,5);circle(368,214,163,`url(#leak-${uid})`,{class:'art-pulse'});circle(222,257,112,`url(#leak-${uid})`,{opacity:.5});path('M95 124h25m-25 0v25m410 153h-25m25 0v-25',paper,1.5,{opacity:.6});
  }else if(item.id==='04'){
    const g=group({transform:'translate(300 207)'});for(let i=0;i<18;i++)add('path',{d:'M0 0 310 -26 310 26Z',fill:i%2?accent:ink,opacity:i%2?.85:.18,transform:`rotate(${i*20})`},undefined,g);circle(300,207,73,paper);txt(300,218,'BURST',31,ink,{'font-weight':900,'text-anchor':'middle'});
  }else if(item.id==='05a'){
    label('ONE FRAME, TWO FEELINGS');rect(82,107,434,220,paper,6);circle(248,211,75,ink);circle(342,211,75,accent);line(300,96,300,337,bg,6);circle(300,211,20,bg);path('M291 205l-6 6 6 6m18-12 6 6-6 6',ink,2);txt(179,355,'BEFORE',10,ink,{'letter-spacing':2,'text-anchor':'middle'});txt(421,355,'AFTER',10,ink,{'letter-spacing':2,'text-anchor':'middle'});
  }else if(item.id==='05b'){
    label('A FINISHING TOUCH');rect(117,94,380,243,ink,12,{opacity:.17,transform:'rotate(5 307 214)'});rect(105,85,380,243,paper,12);circle(296,188,60,bg);face(296,183,41,accent);path('M220 284q18-74 75-63t78 63',ink,0,{fill:ink});rect(148,286,134,17,accent,3);path('M445 98v49m-24-24h49m-13-13-26 26m0-26 26 26',accent,4);
  }else if(item.id==='06'){
    label('THE SHAPE OF SPEED');for(let i=0;i<7;i++)circle(163+i*39,212,59,accent,{opacity:.05+i*.105});circle(397,212,59,accent,{class:'art-slide'});[147,181,243,273].forEach((y,i)=>line(55+(i%2)*30,y,227,y,ink,i%2?3:1.5,{opacity:.4}));path('M452 126l33-15m-25 31 34-3',ink,2);
  }else if(item.id==='07'){
    label('SMOOTHLY UNPREDICTABLE');for(let row=0;row<7;row++){let d='';for(let i=0;i<33;i++){const x=61+i*15,y=127+row*27+Math.sin(i*.3+row*.55)*23;d+=`${i?'L':'M'}${x} ${y}`;if(i%4===0)circle(x,y,3,row%2?accent:ink,{opacity:.5});}path(d,row===3?accent:ink,row===3?4:1,{opacity:row===3?1:.4,class:'art-slide'});}
  }else if(item.id==='08'){
    label('FOLLOW YOUR OWN LINE');path('M90 285C151 57 442 341 514 116',ink,2,{'stroke-dasharray':'4 7',opacity:.3});path('M90 285C140 107 327 238 426 207',accent,6);line(90,285,151,57,ink,1,{opacity:.4});line(514,116,442,341,ink,1,{opacity:.4});[[90,285],[151,57],[514,116],[442,341]].forEach(([x,y])=>rect(x-5,y-5,10,10,paper,0,{stroke:ink,'stroke-width':1}));circle(426,207,14,accent,{class:'art-pulse'});txt(285,318,'M → C → Z',20,ink,{'font-family':'monospace'});
  }else if(item.id==='09'){
    label('BUILT FROM THE BASICS');circle(157,215,68,accent);rect(255,131,126,159,ink,3,{transform:'rotate(12 318 210)'});path('M428 286 490 153 550 286Z',paper,0,{fill:paper});circle(318,210,34,bg);line(73,326,542,326,ink,1,{opacity:.25});
  }else if(item.id==='10'){
    label('GIVE VECTORS ANOTHER SIDE');cube(300,218,91);add('ellipse',{cx:300,cy:254,rx:174,ry:58,fill:'none',stroke:ink,'stroke-width':1.5,transform:'rotate(-20 300 254)',opacity:.5});path('M454 161l-6 21-21-4',ink,2);txt(482,119,'SVG',13,ink,{'font-weight':700});
  }else if(item.id==='11'){
    label('A CHANGE OF CHARACTER');circle(134,211,50,ink);rect(254,161,101,101,accent,26);rect(435,166,87,87,paper,2,{transform:'rotate(17 478 211)'});arrow(194,211);arrow(368,211);txt(300,324,'SIZE · COLOR · RADIUS · ROTATION',10,ink,{'letter-spacing':2,'text-anchor':'middle'});
  }else if(item.id==='12'){
    label('SOME WORDS DESERVE MORE');txt(94,187,'MAKE IT',58,ink,{'font-weight':800,'letter-spacing':-3});txt(94,258,'MATTER.',58,ink,{'font-weight':800,'letter-spacing':-3});path('M91 270q153-14 342-3m-321 13q137-8 284-1',accent,7);path('M436 104q92 3 84 61t-83 32q-58-19-40-55t39-38',accent,3);txt(421,163,'!',45,ink,{'font-weight':800});
  }else if(item.id==='13'){
    label('A SOFTER WAY TO SAY IT');rect(97,115,351,66,paper,23);rect(97,173,410,66,paper,23);rect(97,231,283,66,paper,23);txt(122,160,'WORDS THAT',34,ink,{'font-weight':700});txt(122,218,'FIND THEIR OWN',34,ink,{'font-weight':700});txt(122,276,'SHAPE.',34,accent,{'font-weight':700});
  }else if(item.id==='14'){
    label('KEEP UP WITH EVERY WORD');txt(300,162,'IN THE',35,ink,{'font-weight':700,'text-anchor':'middle'});rect(127,188,346,75,accent,10,{class:'art-pulse'});txt(300,239,'MOMENT',53,ink,{'font-weight':900,'text-anchor':'middle'});timeline(306);rect(188,301,93,10,accent,3);circle(290,306,7,ink);
  }else if(item.id==='15'){
    label('JUST THE RIGHT SIZE');rect(88,134,422,137,'none',0,{stroke:ink,'stroke-width':1,'stroke-dasharray':'5 5'});txt(300,232,'PERFECT FIT',49,ink,{'font-weight':800,'letter-spacing':-2,'text-anchor':'middle',textLength:385,lengthAdjust:'spacingAndGlyphs'});[[88,134],[510,134],[88,271],[510,271]].forEach(([x,y])=>rect(x-5,y-5,10,10,accent));path('M88 301h422m-408-7-14 7 14 7m394-14 14 7-14 7',ink,2);
  }else if(item.id==='16'){
    label('SAME WORD, NEW MOOD');txt(91,160,'Typography',56,ink,{'font-family':'Georgia, serif','font-style':'italic'});txt(91,225,'Typography',50,accent,{'font-family':'Arial, sans-serif','font-weight':900,'letter-spacing':-2});txt(91,291,'Typography',44,ink,{'font-family':'monospace'});line(91,310,506,310,ink,1,{opacity:.3});
  }else if(item.id==='17'){
    label('BRING YOUR OWN TYPE');path('M200 93h153l47 47v182H200Z',ink,2,{fill:paper});path('M353 93v47h47',ink,2);txt(301,233,'Aa',89,ink,{'font-family':'Georgia, serif','text-anchor':'middle'});rect(253,264,99,28,accent,4);txt(302,283,'.woff2',15,ink,{'font-family':'monospace','text-anchor':'middle'});path('M125 185h50m-15-12 15 12-15 12',ink,3);
  }else if(item.id==='18'){
    label('A WHOLE RANGE OF FEELINGS');face(162,179,58,accent);face(430,246,62,paper,{class:'art-float'});circle(319,141,37,ink);path('M304 148q14 20 28 0',paper,3);circle(308,133,3,paper);circle(327,133,3,paper);path('m269 240 13 26 29 4-21 20 5 29-26-14-26 14 5-29-21-20 29-4z',ink,2,{fill:accent,class:'art-pulse'});
  }else if(item.id==='19'){
    label('POINT. CLICK. EXPLAIN.');frame();rect(105,121,88,184,bg,3);[0,1,2,3].forEach(i=>rect(119,141+i*27,53,5,ink,2,{opacity:.3}));rect(226,136,252,89,bg,4);rect(260,256,166,36,accent,7);txt(343,279,'MAKE SOMETHING',11,ink,{'text-anchor':'middle','font-weight':700});cursor(358,268);
  }else if(item.id==='20'){
    label('ONE CLOCK, TWO TIMELINES');frame();txt(108,139,'GSAP',12,ink,{'font-weight':700});path('M108 228C205 226 193 157 272 160S404 252 485 162',accent,4);timeline(267);rect(120,284,112,19,ink,3);rect(254,284,175,19,accent,3);line(303,123,303,319,ink,2);circle(303,165,7,ink);txt(397,140,'FRAME 024',10,ink,{'font-family':'monospace'});
  }else if(item.id==='21'){
    label('VECTOR MOTION, READY TO PLAY');circle(301,210,89,ink,{opacity:.13});path('M210 245q14-169 139-110T377 256 210 245',accent,28);path('M230 285q-73-66-7-128',ink,11);play(304,215,30);txt(452,308,'{ JSON }',17,ink,{'font-family':'monospace'});
  }else if(item.id==='22'){
    label('ONE MOMENT, ON REPEAT');rect(177,108,252,190,paper,10);path('M186 285l64-84 61 60 51-95 59 119z',ink,0,{fill:ink});circle(237,149,17,accent);path('M124 207q-6-116 149-132m-15-9 16 9-14 12m211 83q29 141-177 160m16 10-17-10 13-11',ink,3);rect(264,188,80,42,accent,8);txt(304,216,'GIF',25,ink,{'font-weight':800,'text-anchor':'middle'});
  }else if(item.id==='23'){
    label('SEE WHAT YOU HEAR');waveform(102,210,23);line(93,306,521,306,ink,1,{opacity:.3});txt(94,330,'00:00',9,ink,{'font-family':'monospace'});txt(479,330,'00:12',9,ink,{'font-family':'monospace'});
  }else if(item.id==='24'){
    label('A SOUND FOR THE MOMENT');path('M151 177h39l58-44v149l-58-44h-39z',ink,2,{fill:ink});path('M273 169q40 38 0 78m25-104q66 65 0 131',ink,5);path('m398 101 18 40 44-8-25 37 30 33-44-3-14 42-15-42-45 3 30-33-25-37 44 8z',accent,1,{fill:accent,class:'art-pulse'});txt(359,301,'POP!',35,ink,{'font-weight':900,transform:'rotate(-8 359 301)'});
  }else if(item.id==='27'){
    label('CUT IT ALL TOGETHER');rect(119,82,363,211,paper,9);rect(119,82,363,34,ink,4);for(let i=0;i<7;i++)path(`M${138+i*50} 85l-20 29`,paper,13);play(299,194,36);rect(72,315,144,23,accent,4);rect(223,315,151,23,ink,4);rect(381,315,137,23,paper,4);line(336,292,336,352,accent,2);
  }else if(item.id==='25'){
    label('A SMALL WORLD IN THREE DIMENSIONS');for(let i=0;i<9;i++)line(300,190,42+i*65,354,ink,1,{opacity:.18});for(let i=0;i<5;i++)line(70,240+i*26,534,240+i*26,ink,1,{opacity:.18});cube(299,202,79);circle(439,115,24,paper);path('M439 115L346 128m93-13-71 65',ink,1,{opacity:.4});txt(91,138,'X',10,ink);txt(464,313,'Z',10,ink);line(76,304,122,304,accent,2);line(76,304,76,258,accent,2);
  }else if(item.id==='31'){
    label('UNDERSTAND THE FILE');frame(84,88,432,236);txt(108,142,'clip.mp4',17,ink,{'font-family':'monospace','font-weight':700});rect(405,120,80,23,accent,4);txt(445,136,'NODE.JS',10,ink,{'text-anchor':'middle','font-weight':700});[['duration','00:12.000'],['dimensions','1920 × 1080'],['video codec','H.264'],['frame rate','30 fps']].forEach(([k,v],i)=>{txt(111,186+i*30,k,12,ink,{'font-family':'monospace',opacity:.7});txt(471,186+i*30,v,12,ink,{'font-family':'monospace','text-anchor':'end'});});
  }else return false;
  return true;
}

const THEMES = ['kinetic', 'orbit', 'grid', 'poster', 'terminal', 'editorial', 'data', 'collage', 'particles'];
const PALETTES = [
  ['#c5d1e2', '#222d46', '#f45d3c', '#edf0e6'],
  ['#e9be71', '#3e3423', '#6652b5', '#f3eddc'],
  ['#253f35', '#edf0dd', '#cce88b', '#769785'],
  ['#e76a44', '#30291e', '#ecd9ae', '#fff0d5'],
  ['#b6aed3', '#322747', '#e9dc87', '#f2eedb'],
  ['#e9e3d4', '#283a3a', '#e26f52', '#a9bfc1'],
  ['#142d36', '#e8e3d4', '#a1d4c5', '#628392'],
  ['#c5d38c', '#293c29', '#eb7c50', '#edf0d4']
];

function svgEl(tag, attrs = {}, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  if (text !== undefined) node.textContent = text;
  return node;
}
function hash(value) {
  return Array.from(String(value)).reduce((result, char) => ((result << 5) - result + char.charCodeAt(0)) >>> 0, 2166136261);
}
function random(seed) {
  let value = seed >>> 0;
  return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
}

function add(parent, tag, attrs, text) { const node = svgEl(tag, attrs, text); parent.append(node); return node; }

/** Paints a 600×400 concept cover into an empty <svg>. Returns the palette's background and ink colors. */
export function paintCover(svg, item, index) {
  svg.replaceChildren();
  const seed = hash(item.seed ?? item.id);
  const rng = random(seed);
  const palette = PALETTES[(Number(item.seed) || seed) % PALETTES.length];
  const [bg, ink, accent, paper] = palette;
  const theme = THEMES.includes(item.theme) ? item.theme : THEMES[seed % THEMES.length];
  add(svg, 'rect', { width: 600, height: 400, fill: bg });
  const textStyle = { 'font-family': 'Arial, sans-serif', fill: ink };

  const semanticCover = paintSemanticCover(svg, item, palette);
  if (semanticCover) {
    // Each known reference receives a distinct, originally drawn effect diagram.
  } else if (theme === 'kinetic') {
    for (let i = 0; i < 3; i++) {
      const group = add(svg, 'g', { transform: `translate(${i % 2 ? -20 : 28} ${i * 99 + 105}) rotate(-8 260 20)` });
      add(group, 'text', { ...textStyle, 'font-size': 100, 'font-weight': 900, 'letter-spacing': -7, fill: i === 1 ? accent : ink, class: i === 1 ? 'art-slide' : '' }, ['MAKE', 'IT MOVE', 'AGAIN'][i]);
    }
    add(svg, 'circle', { cx: 492, cy: 103, r: 42, fill: paper, class: 'art-pulse' });
    add(svg, 'path', { d: 'M475 103h34m-17-17v34', stroke: ink, 'stroke-width': 3 });
    add(svg, 'text', { ...textStyle, x: 39, y: 367, 'font-size': 9, 'letter-spacing': 4 }, 'TYPE IN CONTINUOUS PLAY');
  } else if (theme === 'orbit') {
    add(svg, 'circle', { cx: 295, cy: 205, r: 131, fill: ink, opacity: '.06' });
    const rings = add(svg, 'g', { transform: `rotate(${-25 + seed % 45} 300 200)` });
    for (let i = 0; i < 4; i++) add(rings, 'ellipse', { cx: 300, cy: 200, rx: 101 + i * 23, ry: 35 + i * 15, fill: 'none', stroke: ink, 'stroke-width': i === 2 ? 2 : 1, opacity: .4 + i * .13 });
    add(svg, 'circle', { cx: 300, cy: 200, r: 76, fill: accent, class: 'art-float' });
    const stripes = add(svg, 'g', { opacity: '.26' });
    for (let i = 0; i < 10; i++) add(stripes, 'path', { d: `M${252 + i * 8} ${149 + Math.abs(i - 5) * 7}v${103 - Math.abs(i - 5) * 14}`, stroke: ink, 'stroke-width': 3 });
    add(svg, 'circle', { cx: 453, cy: 141, r: 24, fill: paper, class: 'art-float art-delay' });
    add(svg, 'circle', { cx: 150, cy: 280, r: 10, fill: ink });
    add(svg, 'text', { ...textStyle, x: 42, y: 71, 'font-size': 12, 'letter-spacing': 3 }, 'OBJECTS / IN ORBIT');
  } else if (theme === 'grid') {
    const group = add(svg, 'g', { transform: 'translate(161 69) rotate(14 139 134)' });
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      const size = 62;
      const cell = add(group, 'g', { transform: `translate(${col * 69} ${row * 69})` });
      const fill = (row + col + seed) % 3 === 0 ? accent : (row + col) % 2 ? paper : ink;
      if ((row + col + seed) % 4 === 0) add(cell, 'circle', { cx: 31, cy: 31, r: 30, fill, class: 'art-pulse' });
      else add(cell, 'rect', { width: size, height: size, rx: (row + col) % 2 ? 0 : 18, fill });
      if (row === col) add(cell, 'circle', { cx: 31, cy: 31, r: 9, fill: bg });
    }
    add(svg, 'text', { ...textStyle, transform: 'translate(90 303) rotate(-90)', 'font-size': 12, 'letter-spacing': 5 }, 'FORM / FUNCTION');
  } else if (theme === 'poster') {
    add(svg, 'path', { d: 'M300 -80 50 340h500z', fill: paper, opacity: '.2' });
    add(svg, 'ellipse', { cx: 308, cy: 337, rx: 128, ry: 23, fill: ink, opacity: '.12' });
    add(svg, 'rect', { x: 172, y: 306, width: 270, height: 87, fill: ink, opacity: '.85' });
    add(svg, 'ellipse', { cx: 307, cy: 306, rx: 135, ry: 22, fill: paper });
    const object = add(svg, 'g', { class: 'art-float' });
    add(object, 'rect', { x: 240, y: 127, width: 121, height: 183, rx: seed % 2 ? 15 : 57, fill: accent });
    add(object, 'rect', { x: 262, y: 99, width: 76, height: 39, rx: 7, fill: ink });
    add(object, 'path', { d: 'M254 153v117', stroke: paper, 'stroke-width': 5, opacity: '.4' });
    add(object, 'circle', { cx: 300, cy: 211, r: 28, fill: paper });
    add(object, 'text', { x: 301, y: 218, 'text-anchor': 'middle', ...textStyle, 'font-size': 19, 'font-weight': 700 }, 'FJ');
    add(svg, 'text', { ...textStyle, x: 39, y: 86, 'font-size': 12, 'letter-spacing': 4 }, 'CENTER STAGE');
    add(svg, 'path', { d: 'M433 126v55m-27-28h54', stroke: ink, 'stroke-width': 2 });
    add(svg, 'circle', { cx: 160, cy: 234, r: 9, fill: ink });
  } else if (theme === 'terminal') {
    add(svg, 'rect', { x: 89, y: 65, width: 422, height: 274, rx: 10, fill: ink });
    add(svg, 'path', { d: 'M89 105h422', stroke: bg, opacity: '.3' });
    [114, 130, 146].forEach((cx, i) => add(svg, 'circle', { cx, cy: 85, r: 4, fill: [accent, paper, bg][i] }));
    add(svg, 'text', { x: 475, y: 90, fill: paper, 'font-size': 8, 'text-anchor': 'end', 'font-family': 'monospace', opacity: '.7' }, 'motion.workspace');
    const lines = [150, 173, 196, 219];
    lines.forEach((y, i) => {
      add(svg, 'text', { x: 109, y, fill: bg, opacity: '.5', 'font-family': 'monospace', 'font-size': 10 }, String(i + 1).padStart(2, '0'));
      add(svg, 'rect', { x: 139 + (i % 2) * 15, y: y - 9, width: 45 + rng() * 90, height: 8, rx: 3, fill: i === 1 ? accent : paper, opacity: '.8' });
      add(svg, 'rect', { x: 272 + (i % 2) * 10, y: y - 9, width: 60 + rng() * 62, height: 8, rx: 3, fill: bg, opacity: '.35' });
    });
    add(svg, 'path', { d: 'm307 257 26 20-13 4-7 13z', fill: accent, class: 'art-float' });
    add(svg, 'rect', { x: 114, y: 296, width: 147, height: 16, rx: 3, fill: accent, opacity: '.17' });
    add(svg, 'text', { x: 125, y: 307, fill: accent, 'font-family': 'monospace', 'font-size': 8 }, 'READY TO MAKE SOMETHING');
  } else if (theme === 'editorial') {
    add(svg, 'text', { x: 66, y: 93, ...textStyle, 'font-size': 12, 'letter-spacing': 6 }, 'LETTERS IN MOTION');
    add(svg, 'text', { x: 60, y: 267, fill: ink, 'font-family': 'Georgia, serif', 'font-style': seed % 2 ? 'italic' : 'normal', 'font-size': 208, 'letter-spacing': -16, class: 'art-slide' }, seed % 3 ? 'Aa' : 'Rr');
    add(svg, 'path', { d: 'M83 287q130-33 303-8', stroke: accent, 'stroke-width': 11, 'stroke-linecap': 'round', fill: 'none' });
    const star = add(svg, 'g', { transform: 'translate(468 168)' });
    for (let i = 0; i < 8; i++) add(star, 'path', { d: 'M0 -42V42', stroke: accent, 'stroke-width': 10, transform: `rotate(${i * 22.5})` });
    add(svg, 'text', { x: 91, y: 337, ...textStyle, 'font-size': 10, 'letter-spacing': 3 }, 'A STUDY IN EXPRESSION');
  } else if (theme === 'data') {
    for (let i = 0; i < 23; i++) {
      const height = 22 + Math.sin(i / 4) ** 2 * 136 + rng() * 70;
      add(svg, 'rect', { x: 63 + i * 21, y: 205 - height / 2, width: 10, height, rx: 5, fill: i % 4 === 0 ? accent : ink, opacity: i % 3 === 0 ? .55 : 1, class: i % 2 ? 'art-pulse' : 'art-pulse art-delay' });
    }
    add(svg, 'path', { d: 'M63 304h475', stroke: ink, 'stroke-width': 1, opacity: '.35' });
    [0, 1, 2, 3, 4].forEach((i) => add(svg, 'text', { ...textStyle, x: 63 + i * 115, y: 323, 'font-size': 8, 'font-family': 'monospace' }, `00:${String(i * 4).padStart(2, '0')}`));
    add(svg, 'text', { ...textStyle, x: 65, y: 79, 'font-size': 11, 'letter-spacing': 3 }, 'FEEL THE FREQUENCY');
  } else if (theme === 'collage') {
    const card = add(svg, 'g', { transform: 'translate(134 75) rotate(-12 130 120)' });
    add(card, 'rect', { x: 7, y: 9, width: 244, height: 250, rx: 7, fill: ink, opacity: '.15' });
    add(card, 'rect', { width: 244, height: 250, rx: 7, fill: paper });
    add(card, 'circle', { cx: 122, cy: 113, r: 66, fill: accent });
    add(card, 'path', { d: 'M93 99q8-12 16 0m26 0q8-12 16 0m-43 33q15 20 32 0', stroke: ink, 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none' });
    add(card, 'text', { x: 122, y: 218, ...textStyle, 'font-size': 14, 'text-anchor': 'middle', 'letter-spacing': 2 }, 'HELLO, CREATIVE');
    const sticker = add(svg, 'g', { class: 'art-float' });
    add(sticker, 'path', { d: 'm435 95 13 33 35-11-13 35 29 21-37 7 1 38-28-24-29 23 3-38-38-9 31-20-12-35 34 13z', fill: accent, stroke: paper, 'stroke-width': 5 });
    add(svg, 'path', { d: 'M400 263q45-12 42 32m-11-10 12 13 9-14', stroke: ink, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' });
  } else {
    for (let i = 0; i < 42; i++) {
      const x = 70 + rng() * 470;
      const y = 70 + rng() * 275;
      const r = 3 + rng() ** 2 * 29;
      add(svg, 'circle', { cx: x, cy: y, r, fill: i % 3 === 0 ? accent : i % 4 === 0 ? paper : ink, opacity: .3 + rng() * .7, class: i % 3 === 0 ? 'art-float' : 'art-float art-delay' });
    }
    add(svg, 'text', { ...textStyle, x: 43, y: 82, 'font-size': 11, 'letter-spacing': 3 }, 'ORDER / DISORDER');
  }
  // A quiet edition marker makes every composition specific without reusing source art.
  return { bg, ink };
}

import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
function boot(){
 const listeners={},sent=[];
 class AudioContext {
  state='running';handlers=[];
  addEventListener(type,fn){if(type==='statechange')this.handlers.push(fn);}
  change(state){this.state=state;for(const fn of this.handlers)fn();return Promise.resolve();}
  resume(){return this.change('running');} suspend(){return this.change('suspended');} close(){return this.change('closed');}
 }
 const window={AudioContext,addEventListener:(key,fn)=>{listeners[key]=fn;},removeEventListener:key=>{delete listeners[key];}};
 const document={readyState:'loading',hidden:false,focused:true,hasFocus(){return this.focused;},addEventListener:(key,fn)=>{listeners[key]=fn;},removeEventListener:key=>{delete listeners[key];}};
 const parent={postMessage:(data)=>sent.push(data)};
 const context=vm.createContext({window,document,parent,location:{search:'?parentOrigin=https%3A%2F%2Fhost.test',origin:'https://game.test'},URL,URLSearchParams,crypto:{randomUUID:()=> 'audio-round'},localStorage:{getItem:()=>null,setItem:()=>{}},console});
 for(const file of ['ward-audio.js','ward-host.js'])vm.runInContext(readFileSync(new URL('../public/games/endless-ward/'+file,import.meta.url),'utf8'),context);
 const audio=new window.AudioContext();
 const playing=()=>{window.wardHost.update({mode:'playing',muted:false});window.gameModule.start();};
 return{window,document,listeners,audio,playing};
}
test('background blur suspends actual audio before the engine drains any command',async()=>{
 const b=boot();assert.equal(b.audio.state,'suspended');b.playing();assert.equal(b.audio.state,'running');
 b.document.focused=false;b.listeners.blur();assert.equal(b.audio.state,'suspended');
 await b.audio.resume();assert.equal(b.audio.state,'suspended','engine resume cannot bypass the hold');
 b.window.wardHost.update({mode:'playing',muted:false});assert.equal(b.audio.state,'suspended','stale frame cannot unmute');
 b.document.focused=true;b.listeners.focus();assert.equal(b.audio.state,'suspended','focus alone must not resume');
 b.window.wardHost.update({mode:'paused',muted:false});b.window.gameModule.resume();assert.equal(b.audio.state,'suspended');
 b.window.wardHost.update({mode:'playing',muted:false});assert.equal(b.audio.state,'running');
});
test('hidden document suspends every context; returning keeps silence until explicit resume',()=>{
 const b=boot();b.playing();const other=new b.window.AudioContext();assert.equal(other.state,'running');
 b.document.hidden=true;b.listeners.visibilitychange();assert.equal(b.audio.state,'suspended');assert.equal(other.state,'suspended');
 const late=new b.window.AudioContext();assert.equal(late.state,'suspended');
 b.document.hidden=false;b.listeners.visibilitychange();assert.equal(b.audio.state,'suspended');
 b.window.gameModule.resume();assert.equal(b.audio.state,'running');assert.equal(late.state,'running');
});
test('mute persists across focus loss and explicit game resume',()=>{
 const b=boot();b.playing();b.window.wardHost.update({mode:'playing',muted:true});assert.equal(b.audio.state,'suspended');
 b.listeners.blur();b.window.gameModule.resume();b.window.wardHost.update({mode:'playing',muted:true});assert.equal(b.audio.state,'suspended');
 b.window.wardHost.update({mode:'playing',muted:false});assert.equal(b.audio.state,'running');
});
test('dispose and pagehide close audio without any engine frame',()=>{
 const b=boot();b.playing();b.window.gameModule.dispose();assert.equal(b.audio.state,'closed');
 const late=new b.window.AudioContext();assert.equal(late.state,'closed');
 const c=boot();c.playing();c.listeners.pagehide();assert.equal(c.audio.state,'closed');
});

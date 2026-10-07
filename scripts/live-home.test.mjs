import test from 'node:test';
import assert from 'node:assert/strict';
import { artifactWork, promptWork, mediaUrl, escapeHtml } from '../public/design/streaming-v1/live-home.js';

const published = { id:'a',title:'실제 작품',type:'image',status:'published',visibility:'public',fileUrl:'/uploads/photo.jpg',owner:{username:'작가'},metadata:{} };
test('home only accepts published public artifacts',()=>{
  assert.equal(artifactWork({...published,status:'draft'}),null);
  assert.equal(artifactWork({...published,visibility:'private'}),null);
  assert.equal(artifactWork({...published,status:'hidden'}),null);
  assert.equal(artifactWork(published).href,'/app#project?id=a');
});
test('video uses actual output and frame, and links back to its source prompt',()=>{
  const work=artifactWork({...published,type:'video',sourcePromptId:'p',fileUrl:null,metadata:{render:{videoUrl:'https://example.com/movie.mp4'},frames:['https://example.com/frame.jpg']}});
  assert.equal(work.video,'https://example.com/movie.mp4');
  assert.equal(work.image,'https://example.com/frame.jpg');
  assert.equal(work.promptHref,'/app#prompt?id=p');
});
test('games use registered IDs for the existing sandbox player',()=>{
  const work=artifactWork({...published,type:'game',fileUrl:null,contentUrl:'/games/tetris.html'});
  assert.equal(work.image,'/games/thumbs/tetris.png');
  assert.equal(work.playHref,'/app#game-play?id=a');
});
test('active prompt cards use actual thumbnails and prompt detail routes',()=>{
  assert.equal(promptWork({id:'p',status:'archived'}),null);
  const work=promptWork({id:'p',status:'active',title:'프롬프트',thumbnailUrl:'/thumb.jpg'});
  assert.equal(work.image,'/thumb.jpg');
  assert.equal(work.href,'/app#prompt?id=p');
});
test('user content cannot inject HTML or executable media URLs',()=>{
  for (const value of ['javascript:alert(1)','data:text/html,test','//example.com','/\\example.com']) assert.equal(mediaUrl(value),'');
  assert.equal(escapeHtml('<img src=x onerror="x">'), '&lt;img src=x onerror=&quot;x&quot;&gt;');
});

// Sequential entry, explicit slot editing, and per-guess clearing.
export class CodeEntry {
 constructor(length){this.length=length;this.clear();}
 clear(){this.values=Array(this.length).fill('');this.cursor=0;}
 select(index){if(Number.isInteger(index)&&index>=0&&index<this.length)this.cursor=index;}
 insert(symbol){
  let at=this.cursor;
  if(at<0)at=this.values.findIndex(v=>!v);
  if(at<0)return 'full';
  const duplicate=this.values.indexOf(symbol);
  if(duplicate>=0&&duplicate!==at)return 'duplicate';
  this.values[at]=symbol;
  const later=this.values.findIndex((v,i)=>!v&&i>at);
  this.cursor=later>=0?later:this.values.findIndex(v=>!v);
  return 'inserted';
 }
 erase(){let at=this.cursor;if(at<0||!this.values[at]){const limit=at<0?this.length:at;at=this.values.findLastIndex((v,i)=>v&&i<limit);if(at<0)at=this.values.findLastIndex(v=>v);}if(at>=0){this.values[at]='';this.cursor=at;}}
 load(values){this.values=[...values];this.cursor=this.values.findIndex(v=>!v);}
 move(delta){const at=this.cursor<0?0:this.cursor;this.cursor=(at+delta+this.length)%this.length;}
 get full(){return this.values.every(Boolean);}
}

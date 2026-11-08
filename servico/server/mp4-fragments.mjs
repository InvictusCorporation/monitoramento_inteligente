// Only for the single-video fragmented MP4 emitted by our fixed FFmpeg arguments.
// Never forward partial boxes to a late subscriber.
export class Mp4Fragments {
  constructor(onFragment,{maxBox=2*1024*1024,maxInit=512*1024}={}){
    this.onFragment=onFragment;this.maxBox=maxBox;this.maxInit=maxInit;
    this.pending=Buffer.alloc(0);this.ftyp=null;this.init=null;this.moof=null;
  }
  push(chunk){
    // FFmpeg stdout chunks are bounded by Node. Parse incrementally, including split headers.
    let offset=0;
    while(offset<chunk.length){
      const take=Math.min(chunk.length-offset,this.maxBox-this.pending.length);
      if(take<=0)throw Error('Bloco de vídeo excede o limite.');
      this.pending=Buffer.concat([this.pending,chunk.subarray(offset,offset+take)]);offset+=take;
      while(this.pending.length>=8){
        let size=this.pending.readUInt32BE(0),header=8;
        if(size===1){if(this.pending.length<16)break;const wide=this.pending.readBigUInt64BE(8);if(wide>BigInt(this.maxBox))throw Error('Bloco de vídeo excede o limite.');size=Number(wide);header=16}
        if(size<header||size>this.maxBox)throw Error('Estrutura de vídeo inválida.');
        if(this.pending.length<size)break;
        const box=Buffer.from(this.pending.subarray(0,size));this.pending=this.pending.subarray(size);
        this.box(box.toString('ascii',4,8),box);
      }
    }
  }
  box(type,box){
    if(type==='ftyp'&&!this.ftyp&&!this.init){if(box.length>this.maxInit)throw Error('Inicialização muito grande.');this.ftyp=box;return}
    if(type==='moov'&&this.ftyp&&!this.init){
      if(this.ftyp.length+box.length>this.maxInit)throw Error('Inicialização muito grande.');
      this.init=Buffer.concat([this.ftyp,box]);this.ftyp=null;return;
    }
    if(type==='moof'&&this.init&&!this.moof){this.moof=box;return}
    if(type==='mdat'&&this.moof){const fragment=Buffer.concat([this.moof,box]);this.moof=null;this.onFragment(this.init,fragment);return}
    // FFmpeg may finish with an index; it is not needed for live playback.
    if((type==='free'||type==='mfra')&&!this.moof)return;
    throw Error('Sequência de vídeo inválida.');
  }
}

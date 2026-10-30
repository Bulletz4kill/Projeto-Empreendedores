const fs=require('fs'),path=require('path');
const sharp=require(process.argv[2]||'sharp');
const root=path.join(__dirname,'dist'),svg=fs.readFileSync(path.join(root,'brand-icon.svg'));
(async()=>{
  const sizes=[16,32,48,64,128,256],images=[];
  for(const size of sizes)images.push(await sharp(svg).resize(size,size).png().toBuffer());
  const header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);let offset=header.length;
  images.forEach((buffer,index)=>{const pos=6+16*index,size=sizes[index];header[pos]=size===256?0:size;header[pos+1]=size===256?0:size;header.writeUInt16LE(1,pos+4);header.writeUInt16LE(32,pos+6);header.writeUInt32LE(buffer.length,pos+8);header.writeUInt32LE(offset,pos+12);offset+=buffer.length;});
  fs.writeFileSync(path.join(root,'favicon.ico'),Buffer.concat([header,...images]));
  await sharp(svg).resize(32,32).png().toFile(path.join(root,'favicon-32.png'));
  await sharp(svg).resize(180,180).png().toFile(path.join(root,'apple-touch-icon.png'));
  console.log('Favicons generated from the Conecta+ vector logo.');
})();

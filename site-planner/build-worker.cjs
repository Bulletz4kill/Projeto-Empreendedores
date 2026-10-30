const fs=require('fs');const path=require('path');
const root=__dirname;const assets={};
for(const name of ['index.html','styles.css','app.js','planner.html']){
  assets['/'+name]={body:fs.readFileSync(path.join(root,'dist',name),'utf8'),type:({'html':'text/html; charset=utf-8','css':'text/css; charset=utf-8','js':'text/javascript; charset=utf-8'})[name.split('.').pop()]};
}
fs.writeFileSync(path.join(root,'worker','assets.mjs'),'export default '+JSON.stringify(assets)+';');
fs.mkdirSync(path.join(root,'dist','server'),{recursive:true});
fs.mkdirSync(path.join(root,'dist','.openai'),{recursive:true});
const worker=fs.readFileSync(path.join(root,'worker','index.mjs'),'utf8').replace("import assets from './assets.mjs';",'const assets='+JSON.stringify(assets)+';');
fs.writeFileSync(path.join(root,'dist','server','index.js'),worker);
fs.copyFileSync(path.join(root,'.openai','hosting.json'),path.join(root,'dist','.openai','hosting.json'));
console.log('Worker built with embedded assets.');

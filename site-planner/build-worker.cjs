const fs=require('fs');const path=require('path');
const root=__dirname;const assets={};
for(const name of ['index.html','styles.css','app.js','calendar.js','school.js','school.css','brand-icon.svg','brand-logo.svg','planner.html']){
  assets['/'+name]={body:fs.readFileSync(path.join(root,'dist',name),'utf8'),type:({'html':'text/html; charset=utf-8','css':'text/css; charset=utf-8','js':'text/javascript; charset=utf-8','svg':'image/svg+xml'})[name.split('.').pop()]};
}
for(const [name,type]of [['favicon.ico','image/x-icon'],['favicon-32.png','image/png'],['apple-touch-icon.png','image/png']])assets['/'+name]={body:fs.readFileSync(path.join(root,'dist',name)).toString('base64'),base64:true,type};
fs.writeFileSync(path.join(root,'worker','assets.mjs'),'export default '+JSON.stringify(assets)+';');
fs.mkdirSync(path.join(root,'dist','server'),{recursive:true});
fs.mkdirSync(path.join(root,'dist','.openai'),{recursive:true});
const school=fs.readFileSync(path.join(root,'worker','school.mjs'),'utf8').replace('export async function schoolApi','async function schoolApi');
const worker=fs.readFileSync(path.join(root,'worker','index.mjs'),'utf8').replace("import assets from './assets.mjs';",'const assets='+JSON.stringify(assets)+';').replace("import {schoolApi} from './school.mjs';",school);
fs.writeFileSync(path.join(root,'dist','server','index.js'),worker);
fs.copyFileSync(path.join(root,'.openai','hosting.json'),path.join(root,'dist','.openai','hosting.json'));
console.log('Worker built with embedded assets.');

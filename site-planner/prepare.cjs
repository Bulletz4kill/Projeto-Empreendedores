const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const source = fs.readdirSync(root).find(f => f.endsWith('.html'));
if(!source){console.log('Public export: using the empty planner, without school data.');process.exit(0);}
let html = fs.readFileSync(path.join(root, source), 'utf8');
html = html.replace(/<title>[^<]*<\/title>/,'<title>Conecta+ | Planner Escolar</title>');
// Remove the original host's iframe bridge, navigation and storage shims.
// This copy runs independently with browser storage and no parent-frame handshake.
html = html.replace(/<script\b([^>]*)>[\s\S]*?<\/script>/g,(script,attributes)=>/type="module"/.test(attributes)?script:'');
html = html.replace('<head>','<head><script>window._storageReady = Promise.resolve();</script>');
const old = 'h1=()=>{const[a,e]=pe.useState("prof")';
if (!html.includes(old)) throw new Error('Planner entry point not found');
html = html.replace(old, 'h1=()=>{const[a,e]=pe.useState(["prof","pais","alunos"].includes(window.__plannerRole||location.hash.slice(1))?(window.__plannerRole||location.hash.slice(1)):"prof")');
fs.mkdirSync(path.join(__dirname, 'dist'), {recursive:true});
fs.writeFileSync(path.join(__dirname, 'dist', 'planner.html'), html);
console.log('Planner prepared with native browser storage.');

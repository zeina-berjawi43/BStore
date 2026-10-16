const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('standalone manifest has complete branded icons and stable direct-link scope',()=>{
 const manifest=JSON.parse(fs.readFileSync('public/manifest.webmanifest'));
 assert.equal(manifest.name,'BStore');assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'/');assert.equal(manifest.scope,'/');
 for(const icon of manifest.icons){const bytes=fs.readFileSync('public'+icon.src);assert.equal(icon.sizes,`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`);}
 const apple=fs.readFileSync('public/icons/apple-touch-icon.png');assert.equal(apple.readUInt32BE(16),180);
 const html=fs.readFileSync('src/app/+html.tsx','utf8');assert.ok(html.includes('/manifest.webmanifest'));assert.ok(html.includes('apple-touch-icon'));
});
test('PWA adds no service worker registration or persistent price cache',()=>{
 function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
 for(const file of [...files('src'),...files('public')].filter(file=>/\.(tsx?|jsx?|json|webmanifest)$/.test(file))){const code=fs.readFileSync(file,'utf8');assert.doesNotMatch(code,/serviceWorker\s*\.\s*register\s*\(|caches\s*\.\s*open\s*\(/,file);}
});

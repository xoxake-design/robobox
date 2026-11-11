const fs=require('fs'),path=require('path'),os=require('os');
const {WebSocketServer}=require('ws');
const secure=fs.existsSync('cert/key.pem'),PUB=__dirname,OK=['/screen.html','/phone.html'];
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wasm':'application/wasm','.task':'application/octet-stream'};
// Офлайн-режим: если есть папка vendor (npm run vendor), библиотеки берутся с этого компьютера, а не из интернета
const VD=path.join(__dirname,'vendor'),VENDOR=fs.existsSync(path.join(VD,'three.module.js'));
const J='https://cdn.jsdelivr.net/npm/',RW=[[J+'three@0.160.0/build/three.module.js','/vendor/three.module.js'],[J+'three@0.160.0/examples/jsm/','/vendor/addons/'],[J+'qrcode-generator@1.4.4/+esm','/vendor/qrcode.js'],[J+'@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs','/vendor/vision_bundle.mjs'],[J+'@mediapipe/tasks-vision@0.10.14/wasm','/vendor/wasm'],['https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task','/vendor/pose_landmarker_lite.task']];
const SB=process.env.SUPABASE_URL,KEY=process.env.SUPABASE_SERVICE_KEY;
const sb=(p,o={})=>fetch(SB+'/rest/v1/'+p,{...o,headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=minimal'}});
const handler=(req,res)=>{let u=req.url.split('?')[0];if(u==='/')u='/screen.html';
 if(u==='/api/ips'){res.writeHead(200,{'Content-Type':'application/json'});const l=[];if(!process.env.RENDER)for(const[n,as]of Object.entries(os.networkInterfaces()))for(const i of as||[])if(i.family==='IPv4'&&!i.internal)l.push({name:n,address:i.address,bt:/bluetooth/i.test(n)});return res.end(JSON.stringify(l))}
 if(u==='/api/top'){res.writeHead(200,{'Content-Type':'application/json'});if(!SB)return res.end('[]');
  return sb('matches?select=created_at,winner,ko,p1,p2&order=created_at.desc&limit=5').then(r=>r.text()).then(t=>res.end(t)).catch(()=>res.end('[]'))}
 if(u.startsWith('/vendor/')){const g=path.join(__dirname,path.normalize(u));
  if(!g.startsWith(VD)||!fs.existsSync(g)||fs.statSync(g).isDirectory()){res.writeHead(404);return res.end('404')}
  res.writeHead(200,{'Content-Type':mime[path.extname(g)]||'application/octet-stream'});return fs.createReadStream(g).pipe(res)}
 const f=path.join(PUB,path.normalize(u));
 if(!OK.includes(u)||!fs.existsSync(f)){res.writeHead(404);return res.end('404')}
 res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});
 if(VENDOR&&path.extname(f)==='.html'){let b=fs.readFileSync(f,'utf8');for(const[a,c]of RW)b=b.split(a).join(c);return res.end(b)}
 fs.createReadStream(f).pipe(res)};
const server=secure?require('https').createServer({key:fs.readFileSync('cert/key.pem'),cert:fs.readFileSync('cert/cert.pem')},handler):require('http').createServer(handler);
const rooms={};
const send=(w,o)=>{if(w&&w.readyState===1)w.send(JSON.stringify(o))};
new WebSocketServer({server}).on('connection',ws=>{
 ws.on('message',d=>{let m;try{m=JSON.parse(d)}catch{return}
  if(m.t==='create'){const c=Math.random().toString(36).slice(2,6).toUpperCase();rooms[c]={screen:ws,p:[null,null]};ws.room=c;ws.role='screen';send(ws,{t:'room',code:c})}
  else if(m.t==='join'){const r=rooms[m.code];if(!r)return send(ws,{t:'nores'});const s=r.p.indexOf(null);if(s<0)return send(ws,{t:'full'});
   r.p[s]=ws;ws.room=m.code;ws.role='phone';ws.slot=s;send(ws,{t:'joined',slot:s});send(r.screen,{t:'player',slot:s,on:true})}
  else if(ws.role==='phone'){const r=rooms[ws.room];if(r)send(r.screen,{...m,slot:ws.slot})}
  else if(ws.role==='screen'){if(m.t==='result'){SB&&sb('matches',{method:'POST',body:JSON.stringify({winner:m.winner,ko:m.ko,duration:m.duration,p1:m.p1,p2:m.p2})}).catch(()=>{});return}const r=rooms[ws.room];if(r)(m.to==='all'?r.p:[r.p[m.to]]).forEach(p=>send(p,m))}});
 ws.on('close',()=>{const r=rooms[ws.room];if(!r)return;
  if(ws.role==='phone'){r.p[ws.slot]=null;send(r.screen,{t:'player',slot:ws.slot,on:false})}
  else{r.p.forEach(p=>p&&p.close());delete rooms[ws.room]}})});
const port=process.env.PORT||3000,proto=secure?'https':'http';
server.listen(port,()=>{console.log('Открой на большом экране:');
 for(const a of Object.values(os.networkInterfaces()).flat())if(a.family==='IPv4'&&!a.internal)console.log(`  ${proto}://${a.address}:${port}/`);
 if(VENDOR)console.log('Офлайн-режим: библиотеки берутся из папки vendor, интернет не нужен.');
 if(!secure)console.log('! Нет cert/ — камера на телефоне работает только по HTTPS. Запусти: npm run cert')});

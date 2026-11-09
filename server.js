const fs=require('fs'),path=require('path'),os=require('os');
const {WebSocketServer}=require('ws');
const secure=fs.existsSync('cert/key.pem'),PUB=__dirname,OK=['/screen.html','/phone.html'];
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css'};
const SB=process.env.SUPABASE_URL,KEY=process.env.SUPABASE_SERVICE_KEY;
const sb=(p,o={})=>fetch(SB+'/rest/v1/'+p,{...o,headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=minimal'}});
const handler=(req,res)=>{let u=req.url.split('?')[0];if(u==='/')u='/screen.html';
 if(u==='/api/top'){res.writeHead(200,{'Content-Type':'application/json'});if(!SB)return res.end('[]');
  return sb('matches?select=created_at,winner,ko,p1,p2&order=created_at.desc&limit=5').then(r=>r.text()).then(t=>res.end(t)).catch(()=>res.end('[]'))}
 const f=path.join(PUB,path.normalize(u));
 if(!OK.includes(u)||!fs.existsSync(f)){res.writeHead(404);return res.end('404')}
 res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res)};
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
 if(!secure)console.log('! Нет cert/ — камера на телефоне работает только по HTTPS. Запусти: npm run cert')});

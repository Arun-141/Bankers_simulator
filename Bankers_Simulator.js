const $=id=>document.getElementById(id),L=j=>String.fromCharCode(65+j),F=a=>'['+a.join(', ')+']';
let n=0,m=0,steps=[],si=-1,timer=null,tot=[],pending=null;
const EX={
 book:{A:[[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]],M:[[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]],V:[3,3,2]},
 small:{A:[[1,0,1],[1,1,0],[1,0,0],[0,1,1]],M:[[3,2,2],[2,2,1],[2,1,1],[1,2,2]],V:[2,1,1]},
 dead:{A:[[1,0],[0,1],[1,1]],M:[[2,2],[2,2],[3,3]],V:[0,0]}
};

function grid(el,title,p,rows,ro){
  let h=`<h3>${title}</h3><table><tr><th></th>`+[...Array(m)].map((_,j)=>`<th>${L(j)}</th>`).join('')+'</tr>';
  for(let i=0;i<rows;i++){
    h+=`<tr><th>${p==='v'?'Avail':'P'+i}</th>`;
    for(let j=0;j<m;j++) h+=ro?`<td class="need" id="${p}${i}_${j}">0</td>`
      :`<td><input type="number" min="0" id="${p}${i}_${j}" value="0" oninput="upd()" aria-label="${title} ${p==='v'?'':'P'+i+' '}${L(j)}"></td>`;
    h+='</tr>';
  }
  $(el).innerHTML=h+'</table>';
}
function gen(){
  const nn=+$('n').value,mm=+$('m').value;
  if(!Number.isInteger(nn)||!Number.isInteger(mm)||nn<1||nn>10||mm<1||mm>6){
    return showErr(['Processes must be a whole number from 1 to 10 and resource types from 1 to 6.']);
  }
  n=nn;m=mm;stop();clearSim();
  grid('tA','Allocation','a',n);grid('tM','Maximum','x',n);grid('tV','Available','v',1);grid('tN','Need','d',n,true);grid('tR','Request (current)','r',n);clearDet();
  $('rp').innerHTML=[...Array(n)].map((_,i)=>`<option value="${i}">P${i}</option>`).join('');
  $('rv').value='';$('rout').hidden=true;$('applyBtn').hidden=true;
  upd();
}
function showErr(list){const e=$('errs');e.hidden=!list.length;e.innerHTML=list.slice(0,8).map(x=>`<div>&#9888; ${x}</div>`).join('')+(list.length>8?`<div>…and ${list.length-8} more</div>`:'');}

function read(){
  const err=[];
  const g=(p,r,name)=>{const a=[];for(let i=0;i<r;i++){a.push([]);for(let j=0;j<m;j++){
    const e=$(p+i+'_'+j),s=e.value.trim(),v=Number(s);e.classList.remove('bad');
    if(s===''||!Number.isInteger(v)||v<0){e.classList.add('bad');err.push(`${name} ${p==='v'?'':'P'+i+' '}${L(j)}: enter a whole number, 0 or greater.`);a[i].push(0)}
    else a[i].push(v)}}return a};
  const A=g('a',n,'Allocation'),M=g('x',n,'Maximum'),V=g('v',1,'Available')[0];
  for(let i=0;i<n;i++)for(let j=0;j<m;j++)if(A[i][j]>M[i][j]){
    $('a'+i+'_'+j).classList.add('bad');$('x'+i+'_'+j).classList.add('bad');
    err.push(`P${i}: Allocation of ${L(j)} (${A[i][j]}) exceeds its Maximum (${M[i][j]}).`);}
  return{A,M,V,err,N:A.map((r,i)=>r.map((x,j)=>M[i][j]-x))};
}
function upd(){
  if(!n)return null;
  const r=read();showErr(r.err);
  r.N.forEach((row,i)=>row.forEach((v,j)=>{const c=$('d'+i+'_'+j);c.textContent=v;c.classList.toggle('bad',v<0)}));
  return r;
}
function loadEx(k){
  if(!k)return;const e=EX[k];
  $('n').value=e.A.length;$('m').value=e.V.length;gen();
  e.A.forEach((r,i)=>r.forEach((v,j)=>{$('a'+i+'_'+j).value=v;$('x'+i+'_'+j).value=e.M[i][j]}));
  e.V.forEach((v,j)=>$('v0_'+j).value=v);if(e.R)e.R.forEach((r,i)=>r.forEach((v,j)=>$('r'+i+'_'+j).value=v));upd();
}
function resetAll(){stop();$('ex').value='';$('n').value=5;$('m').value=3;gen();}

/* Safety algorithm: returns the full list of steps for playback */
function run(A,N,V){
  const w=V.slice(),fin=Array(A.length).fill(false),out=[{t:'init',work:[...w]}],order=[];
  let prog=true;
  while(prog){prog=false;
    for(let i=0;i<A.length;i++){if(fin[i])continue;
      const ok=N[i].every((x,j)=>x<=w[j]);
      out.push({t:'check',i,ok,need:N[i],work:[...w]});
      if(ok){A[i].forEach((x,j)=>w[j]+=x);fin[i]=true;order.push(i);prog=true;
        out.push({t:'finish',i,rel:A[i],work:[...w]});}}}
  out.push(order.length===A.length?{t:'safe',order}:{t:'unsafe',stuck:fin.map((f,i)=>f?-1:i).filter(i=>i>=0)});
  return out;
}

function startSim(){
  if(!n)gen();
  const r=upd();
  if(!r||r.err.length)return;
  stop();clearSim();
  tot=r.V.map((v,j)=>v+r.A.reduce((s,row)=>s+row[j],0));
  steps=run(r.A,r.N,r.V);si=-1;
  $('pool').innerHTML=tot.map((t,j)=>`<div class="pl" id="pl${j}">Resource ${L(j)}<span style="float:right" id="pv${j}"></span><div class="bar"><div class="fill" id="pf${j}"></div></div></div>`).join('');
  $('cards').innerHTML=r.A.map((a,i)=>`<div class="card" id="pc${i}"><b>P${i}</b><small>Alloc ${F(a)}</small><small>Need ${F(r.N[i])}</small><div class="st">Pending</div></div>`).join('');
  paintPool(r.V);$('work').textContent=F(r.V);
  step();
}
function clearSim(){$('log').innerHTML='';$('cards').innerHTML='';$('pool').innerHTML='';$('banner').hidden=true;$('work').textContent='–';steps=[];si=-1;}
function paintPool(w,rel){w.forEach((v,j)=>{
  $('pf'+j).style.width=(tot[j]?v/tot[j]*100:0)+'%';$('pv'+j).textContent=v+' / '+tot[j];
  if(rel&&rel[j]){const s=document.createElement('span');s.className='fl';s.textContent='+'+rel[j];$('pl'+j).appendChild(s);setTimeout(()=>s.remove(),1500)}});}

function step(){
  if(!steps.length)return startSim();
  if(si>=steps.length-1){stop();return}
  si++;const s=steps[si];
  let w=steps[0].work,done=new Set();
  for(let q=0;q<=si;q++){if(steps[q].work)w=steps[q].work;if(steps[q].t==='finish')done.add(steps[q].i)}
  document.querySelectorAll('#cards .card').forEach((c,i)=>{
    const cur=s.i===i,d=done.has(i);
    c.className='card'+(d?' done':'')+(cur&&s.t==='check'?(s.ok?' run':' wait'):'')+(cur&&s.t==='finish'?' flash':'');
    c.querySelector('.st').textContent=d?'Finished ✔':cur&&s.t==='check'?(s.ok?'Can run…':'Must wait ✘'):'Pending';
  });
  paintPool(w,s.t==='finish'?s.rel:null);$('work').textContent=F(w);
  let msg,cls;
  if(s.t==='init'){msg=`Start: Work = Available = ${F(w)}, all Finish flags false.`;cls='y'}
  else if(s.t==='check'){msg=s.ok?`P${s.i}: Need ${F(s.need)} ≤ Work ${F(s.work)} → can proceed.`:`P${s.i}: Need ${F(s.need)} exceeds Work ${F(s.work)} → skip for now.`;cls=s.ok?'y':'n'}
  else if(s.t==='finish'){msg=`P${s.i} completes and releases ${F(s.rel)}. Work = ${F(s.work)}.`;cls='f'}
  else if(s.t==='safe'){msg=`SAFE state. Safe sequence: ${s.order.map(i=>'P'+i).join(' → ')}`;cls='f';banner('ok','✔ System is SAFE — safe sequence: &lt; '+s.order.map(i=>'P'+i).join(', ')+' &gt;')}
  else{msg=`UNSAFE: ${s.stuck.map(i=>'P'+i).join(', ')} can never get their Need — no safe sequence exists.`;cls='x';banner('bad','✘ UNSAFE state — no safe sequence. Blocked: '+s.stuck.map(i=>'P'+i).join(', ')+'. Deadlock is possible.')}
  const li=document.createElement('li');li.className=cls;li.textContent=msg;$('log').appendChild(li);li.scrollIntoView({block:'nearest'});
  if(si>=steps.length-1)stop();
}
function banner(c,h){const b=$('banner');b.className='banner '+c;b.innerHTML=h;b.hidden=false}
function auto(){
  if(timer){stop();return}
  if(!steps.length||si>=steps.length-1){startSim();if(!steps.length)return}
  $('autoBtn').textContent='Pause';
  timer=setInterval(step,+$('spd').value);
}
function stop(){clearInterval(timer);timer=null;$('autoBtn').textContent='Auto play'}

/* Resource-request algorithm */
function rout(c,h){const b=$('rout');b.className='banner '+c;b.innerHTML=h;b.hidden=false}
function checkReq(){
  $('applyBtn').hidden=true;pending=null;
  const r=upd();
  if(!r)return rout('bad','Generate the tables first.');
  if(r.err.length)return rout('bad','Fix the input errors above before testing a request.');
  const i=+$('rp').value,q=$('rv').value.split(/[\s,]+/).filter(x=>x!=='').map(Number);
  if(q.length!==m||q.some(x=>!Number.isInteger(x)||x<0))return rout('bad',`Enter exactly ${m} whole numbers (0 or greater), separated by commas.`);
  if(q.some((x,j)=>x>r.N[i][j]))return rout('bad',`✘ Denied: request ${F(q)} exceeds P${i}'s remaining Need ${F(r.N[i])}. The process has exceeded its declared maximum claim.`);
  if(q.some((x,j)=>x>r.V[j]))return rout('bad',`⏳ P${i} must wait: request ${F(q)} exceeds Available ${F(r.V)}.`);
  const A2=r.A.map(x=>[...x]),N2=r.N.map(x=>[...x]),V2=[...r.V];
  q.forEach((x,j)=>{A2[i][j]+=x;N2[i][j]-=x;V2[j]-=x});
  const st=run(A2,N2,V2),last=st[st.length-1];
  if(last.t==='safe'){pending={i,q};$('applyBtn').hidden=false;
    rout('ok',`✔ Granted: after allocating ${F(q)} to P${i} the state stays SAFE. Sequence: ${last.order.map(k=>'P'+k).join(', ')}.`)}
  else rout('bad',`✘ Denied: granting ${F(q)} to P${i} leads to an UNSAFE state (${last.stuck.map(k=>'P'+k).join(', ')} would be stuck). Request rolled back.`);
}
function applyReq(){
  if(!pending)return;const{i,q}=pending;
  q.forEach((x,j)=>{$('a'+i+'_'+j).value=+$('a'+i+'_'+j).value+x;$('v0_'+j).value=+$('v0_'+j).value-x});
  pending=null;$('applyBtn').hidden=true;$('rout').hidden=true;clearSim();upd();
}
loadEx('book');$('ex').value='book';

/* ===== Interactive tutorial (shown before the simulator) ===== */
let ts=0,vault=10,al=3,dt=null;
const DA=[[1],[2],[3]],DN=[[4],[2],[5]];
const SL=[
 {h:'Think of it as a bank',p:'A bank has limited cash. Every customer (process) tells the banker the most it may ever borrow (its Maximum). The banker only lends if it can still guarantee that everyone can finish and repay. Try lending and repaying coins:',
  v:()=>`<div class="pl">Vault coins<span style="float:right" id="vv"></span><div class="bar tall"><div class="fill" id="vf"></div></div></div><div class="row"><button onclick="vlt(-2)">Lend 2 coins</button><button onclick="vlt(2)">Customer repays 2</button></div>`,i:()=>vlt(0)},
 {h:'Need = Maximum − Allocation',p:'Allocation is what a process holds now. Need is how much more it may still ask for. Change the allocation of a process whose Maximum is 7 and watch Need update:',
  v:()=>`<div class="row" style="align-items:center"><span>Maximum = <b>7</b></span><button onclick="aly(-1)">−</button><span>Allocation = <b id="al"></b></span><button onclick="aly(1)">+</button><span>Need = <b id="nd" class="amb"></b></span></div><div class="bar tall"><div class="fill" id="af"></div></div>`,i:()=>aly(0)},
 {h:'The safety check',p:'Work starts equal to Available. Find any process whose Need fits in Work. Let it finish, add its Allocation back to Work, and repeat. Press play to watch the banker do this:',
  v:()=>`<div class="work">Work = <b id="dw">3</b></div><div class="cards" id="dc">${DA.map((a,i)=>`<div class="card" id="dp${i}"><b>P${i}</b><small>Alloc ${a[0]}</small><small>Need ${DN[i][0]}</small><div class="st">Pending</div></div>`).join('')}</div><div class="row"><button onclick="demo()">Play demo</button></div><p class="hint" id="dmsg">Waiting to start…</p>`},
 {h:'Safe or unsafe?',p:'If every process can finish this way, the state is safe and the order is the safe sequence. If the banker gets stuck, the state is unsafe. Slide the available coins and find the smallest value that makes this system safe:',
  v:()=>`<label>Available coins = <b id="sv">3</b><input type="range" min="0" max="6" value="3" oninput="sfy(this.value)"></label><p class="hint">Processes still need 4, 2 and 5 coins.</p><div class="banner" id="sres"></div>`,i:()=>sfy(3)},
 {h:'Quick check',p:'Work = 2 coins. Process P3 has Need = 3 coins. Can P3 run right now?',
  v:()=>`<div class="row"><button onclick="qz(0)">Yes</button><button onclick="qz(1)">No, it must wait</button></div><div class="banner" id="qr" hidden></div>`}
];
function tgo(d){
  if(ts+d>=SL.length)return unlock();
  ts=Math.max(0,ts+d);clearInterval(dt);const s=SL[ts];
  $('slide').innerHTML=`<h3>${s.h}</h3><p>${s.p}</p>${s.v()}`;
  $('dots').innerHTML=SL.map((_,i)=>`<button class="${i===ts?'on':''}" onclick="ts=${i}-0;tgo(0)" aria-label="Slide ${i+1}"></button>`).join('');
  $('nextT').textContent=ts===SL.length-1?'Start the simulator':'Next';
  if(s.i)s.i();
}
function vlt(d){vault=Math.max(0,Math.min(10,vault+d));$('vf').style.width=vault*10+'%';$('vv').textContent=vault+' / 10'}
function aly(d){al=Math.max(0,Math.min(7,al+d));$('al').textContent=al;$('nd').textContent=7-al;$('af').style.width=al/7*100+'%'}
function sfy(v){
  $('sv').textContent=v;const st=run(DA,DN,[+v]),l=st[st.length-1],b=$('sres');
  b.className='banner '+(l.t==='safe'?'ok':'bad');
  b.textContent=l.t==='safe'?'SAFE. Sequence: '+l.order.map(i=>'P'+i).join(' → '):'UNSAFE. Nobody can finish with so few coins.';
}
function qz(ok){const b=$('qr');b.hidden=false;b.className='banner '+(ok?'ok':'bad');
  b.textContent=ok?'Correct. Need 3 is larger than Work 2, so P3 waits until another process releases resources. You are ready.':'Not quite. Need 3 is larger than Work 2, so P3 cannot run yet. Try the other answer.'}
function demo(){
  clearInterval(dt);const st=run(DA,DN,[3]);let k=0;
  document.querySelectorAll('#dc .card').forEach(c=>{c.className='card';c.querySelector('.st').textContent='Pending'});
  $('dw').textContent=3;
  dt=setInterval(()=>{
    if(k>=st.length)return clearInterval(dt);
    const s=st[k++],c=$('dp'+s.i),m=$('dmsg');
    if(s.t==='check'){c.className='card '+(s.ok?'run':'wait');c.querySelector('.st').textContent=s.ok?'Fits':'Too big';m.textContent=`P${s.i} needs ${s.need[0]}, Work is ${s.work[0]} → ${s.ok?'it can run.':'not yet.'}`}
    else if(s.t==='finish'){c.className='card done flash';c.querySelector('.st').textContent='Finished';$('dw').textContent=s.work[0];m.textContent=`P${s.i} finishes and returns ${s.rel[0]} coins. Work grows to ${s.work[0]}.`}
    else if(s.t==='safe')m.textContent='Everyone finished. Safe sequence: '+s.order.map(i=>'P'+i).join(' → ')+'.';
  },1200);
}
function unlock(){clearInterval(dt);$('intro').hidden=true;$('app').hidden=false;$('app').scrollIntoView({behavior:'smooth'})}
function replay(){stop();ts=0;$('app').hidden=true;$('intro').hidden=false;tgo(0);window.scrollTo({top:0,behavior:'smooth'})}
tgo(0);

/* ===== Landing page: OS-themed animated background ===== */
const cv=$('bg'),cx=cv.getContext('2d'),T=9000,t0=performance.now(),NM=['Kernel data stream','Resource allocation graph','Physical memory map'];
const rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
let W,H,cols,nodes,edges,cells,gw,sc=-1;
function init(){
  W=cv.width=innerWidth;H=cv.height=innerHeight;const R=(a,b)=>a+Math.random()*(b-a);
  cols=[...Array(Math.ceil(W/20))].map((_,i)=>({x:i*20,y:R(0,H),s:R(1,3.5)}));
  nodes=[...Array(8)].map((_,i)=>({p:i<5,x:R(100,W-100),y:R(100,H-100),vx:R(-.5,.5),vy:R(-.5,.5),l:i<5?'P'+i:'R'+(i-5)}));
  edges=[...Array(5)].flatMap((_,i)=>[[5+i%3,i],[i,5+(i+1)%3]]);
  gw=Math.ceil(W/38);cells=[...Array(gw*Math.ceil(H/38))].map(()=>Math.floor(Math.random()*4));
}
function rain(){
  cx.font='14px JetBrains Mono, monospace';const g='01ABCDEF<>{}#$';
  cols.forEach(c=>{c.y+=c.s;if(c.y>H+160)c.y=-20;
    for(let k=0;k<9;k++){cx.fillStyle=k?`rgba(167,139,250,${.5-k*.05})`:'#f472b6';
      cx.fillText(g[Math.abs((Math.floor(c.y/16)-k)*31+c.x*7)%g.length|0],c.x,c.y-k*16)}});
}
function graph(now){
  nodes.forEach(n=>{n.x+=n.vx;n.y+=n.vy;if(n.x<60||n.x>W-60)n.vx*=-1;if(n.y<60||n.y>H-60)n.vy*=-1});
  edges.forEach(([f,t],i)=>{const A=nodes[f],B=nodes[t],p=(now/2000+i*.13)%1;
    cx.strokeStyle=i%2?'rgba(251,191,36,.5)':'rgba(52,211,153,.5)';cx.setLineDash(i%2?[6,6]:[]);cx.lineWidth=1.5;
    cx.beginPath();cx.moveTo(A.x,A.y);cx.lineTo(B.x,B.y);cx.stroke();
    cx.fillStyle='#fff';cx.beginPath();cx.arc(A.x+(B.x-A.x)*p,A.y+(B.y-A.y)*p,3,0,7);cx.fill()});
  cx.setLineDash([]);cx.font='13px JetBrains Mono, monospace';cx.textAlign='center';
  nodes.forEach(n=>{cx.fillStyle=n.p?'#7c3aed':'#db2777';cx.strokeStyle='#eef0ff';cx.lineWidth=2;cx.beginPath();
    if(n.p)cx.arc(n.x,n.y,22,0,7);else cx.rect(n.x-20,n.y-20,40,40);cx.fill();cx.stroke();cx.fillStyle='#fff';cx.fillText(n.l,n.x,n.y+4)});
  cx.textAlign='left';
}
function mem(now){
  const C=['rgba(255,255,255,.05)','rgba(167,139,250,.55)','rgba(244,114,182,.55)','rgba(52,211,153,.55)'];
  for(let k=0;k<3;k++)cells[Math.floor(Math.random()*cells.length)]=Math.floor(Math.random()*4);
  cells.forEach((v,i)=>{cx.fillStyle=C[v];cx.fillRect(i%gw*38+3,Math.floor(i/gw)*38+3,32,32)});
  cx.fillStyle='rgba(244,114,182,.15)';cx.fillRect((now/12)%W,0,38,H);
}
function frame(now){
  const e=now-t0,loc=e%T,s=Math.floor(e/T)%3,a=Math.min(1,loc/1200,(T-loc)/1200);
  if(s!==sc){sc=s;$('cap').textContent='● '+NM[s]}
  cx.clearRect(0,0,W,H);cx.globalAlpha=Math.max(a,rm?1:0);[rain,graph,mem][s](now);
  if(!rm)requestAnimationFrame(frame);
}
const TL=['$ banker --load textbook','Available = [3, 3, 2]','P1: Need [1, 2, 2] fits Work  ✔','P1 done, Work = [5, 3, 2]','P3: Need [0, 1, 1] fits Work  ✔','P3 done, Work = [7, 4, 3]','SAFE  <P1, P3, P4, P0, P2>'];
let li=0,ci=0;
function type(){
  const el=$('term');
  if(li>=TL.length){setTimeout(()=>{li=0;ci=0;type()},3500);return}
  el.textContent=TL.slice(0,li).join('\n')+(li?'\n':'')+TL[li].slice(0,++ci)+'▌';
  if(ci>=TL[li].length){li++;ci=0;setTimeout(type,500)}else setTimeout(type,35);
}
function launch(skip){
  $('landing').hidden=true;$('site').hidden=false;document.body.classList.add('inside');window.scrollTo(0,0);
  if(skip)unlock();
}
function goHome(){stop();$('site').hidden=true;$('landing').hidden=false;document.body.classList.remove('inside');window.scrollTo(0,0)}
init();addEventListener('resize',init);frame(performance.now());type();

/* landing step buttons: 1 = tutorial, 2 = input tables, 3 = run a ready example */
function chipGo(k){
  if(k===1)return launch();
  launch(true);
  if(k===3){loadEx('book');$('ex').value='book';startSim()}
  setTimeout(()=>$(k===2?'config':'sim').scrollIntoView({behavior:'smooth'}),80);
}

/* ===== Deadlock detection (uses Allocation, Available and current Request) ===== */
const MK=(A,R)=>({A,R,V:[0,0,0],M:A.map((r,i)=>r.map((x,j)=>x+R[i][j]))});
const DA0=[[0,1,0],[2,0,0],[3,0,3],[2,1,1],[0,0,2]];
EX.det1=MK(DA0,[[0,0,0],[2,0,2],[0,0,0],[1,0,0],[0,0,2]]);
EX.det2=MK(DA0,[[0,0,0],[2,0,2],[0,0,1],[1,0,0],[0,0,2]]);
let dsteps=[],dk=-1,dtm=null;
function detect(A,R,V){
  const w=[...V],fin=A.map(r=>r.every(x=>x===0)),out=[{t:'init',work:[...w],free:fin.map((f,i)=>f?i:-1).filter(i=>i>=0)}],order=[];
  let prog=true;
  while(prog){prog=false;
    for(let i=0;i<A.length;i++){if(fin[i])continue;
      const ok=R[i].every((x,j)=>x<=w[j]);
      out.push({t:'check',i,ok,req:R[i],work:[...w]});
      if(ok){A[i].forEach((x,j)=>w[j]+=x);fin[i]=true;order.push(i);prog=true;out.push({t:'finish',i,rel:A[i],work:[...w]})}}}
  const dead=fin.map((f,i)=>f?-1:i).filter(i=>i>=0);
  out.push(dead.length?{t:'dead',dead}:{t:'ok',order});
  return out;
}
function dbanner(c,h){const b=$('dbanner');b.className='banner '+c;b.innerHTML=h;b.hidden=false}
function clearDet(){clearInterval(dtm);dsteps=[];dk=-1;if(!$('dcards'))return;$('dcards').innerHTML='';$('dlog').innerHTML='';$('dbanner').hidden=true}
function startDet(){
  if(!n)gen();
  const r=upd();if(!r)return;
  if(r.err.length)return dbanner('bad','Fix the errors in the Allocation, Maximum and Available tables first (see the top of the page).');
  const R=[],bad=[];
  for(let i=0;i<n;i++){R.push([]);for(let j=0;j<m;j++){
    const e=$('r'+i+'_'+j),s=e.value.trim(),v=Number(s);e.classList.remove('bad');
    if(s===''||!Number.isInteger(v)||v<0){e.classList.add('bad');bad.push(`Request P${i} ${L(j)}: enter a whole number, 0 or greater.`);R[i].push(0)}else R[i].push(v)}}
  if(bad.length)return dbanner('bad',bad.slice(0,6).join('<br>'));
  clearDet();
  dsteps=detect(r.A,R,r.V);
  $('dcards').innerHTML=r.A.map((a,i)=>`<div class="card" id="dpc${i}"><b>P${i}</b><small>Alloc ${F(a)}</small><small>Request ${F(R[i])}</small><div class="st">Pending</div></div>`).join('');
  dtm=setInterval(dstep,Math.min(+$('spd').value,1000));dstep();
}
function dstep(){
  if(++dk>=dsteps.length)return clearInterval(dtm);
  const s=dsteps[dk];let done=new Set(dsteps[0].free),dead=new Set();
  for(let q=0;q<=dk;q++){const t=dsteps[q];if(t.t==='finish')done.add(t.i);if(t.t==='dead')t.dead.forEach(i=>dead.add(i))}
  document.querySelectorAll('#dcards .card').forEach((c,i)=>{
    const cur=s.i===i,d=done.has(i),x=dead.has(i);
    c.className='card'+(d?' done':'')+(x?' dead':'')+(cur&&s.t==='check'?(s.ok?' run':' wait'):'')+(cur&&s.t==='finish'?' flash':'');
    c.querySelector('.st').textContent=x?'Deadlocked ✘':d?(dsteps[0].free.includes(i)?'Holds nothing ✔':'Finished ✔'):cur&&s.t==='check'?(s.ok?'Can proceed…':'Blocked ✘'):'Pending';
  });
  let msg,cls;
  if(s.t==='init'){msg=`Work = Available = ${F(s.work)}.`+(s.free.length?` ${s.free.map(i=>'P'+i).join(', ')} hold no resources, so they cannot be deadlocked.`:'');cls='y'}
  else if(s.t==='check'){msg=s.ok?`P${s.i}: Request ${F(s.req)} ≤ Work ${F(s.work)} → can be satisfied.`:`P${s.i}: Request ${F(s.req)} exceeds Work ${F(s.work)} → blocked for now.`;cls=s.ok?'y':'n'}
  else if(s.t==='finish'){msg=`P${s.i} finishes and releases ${F(s.rel)}. Work = ${F(s.work)}.`;cls='f'}
  else if(s.t==='ok'){msg='No deadlock: every process can finish.';cls='f';dbanner('ok','✔ NO DEADLOCK — every process can finish. Order: &lt; '+s.order.map(i=>'P'+i).join(', ')+' &gt;')}
  else{msg=`DEADLOCK: ${s.dead.map(i=>'P'+i).join(', ')} can never get their requested resources.`;cls='x';dbanner('bad','✘ DEADLOCK DETECTED — '+s.dead.map(i=>'P'+i).join(', ')+' are deadlocked: each waits for resources that only another blocked process can release.')}
  const li=document.createElement('li');li.className=cls;li.textContent=msg;$('dlog').appendChild(li);li.scrollIntoView({block:'nearest'});
}

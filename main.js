const $ = (q, el=document) => el.querySelector(q);
const $$ = (q, el=document) => [...el.querySelectorAll(q)];

const API = {
  async list(from, to){
    const u = new URL('/api/bookings', location.origin);
    if(from && to){ u.searchParams.set('from', from); u.searchParams.set('to', to); }
    const r = await fetch(u);
    return r.json();
  },
  async add({name, start, end, note, code}){
    const r = await fetch('/api/bookings', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name,start,end,note,code})});
    if(!r.ok){ throw {status:r.status, data: await r.json().catch(()=>({}))}; }
    return r.json();
  },
  async del(id, code){
    const u = new URL(`/api/bookings/${id}`, location.origin);
    if(code) u.searchParams.set('code', code);
    const r = await fetch(u, {method:'DELETE'});
    if(!r.ok){ throw {status:r.status, data: await r.json().catch(()=>({}))}; }
  }
}

const fmt = d=> d.toISOString().slice(0,10);
function addMonths(d, m){ const x = new Date(d); x.setMonth(x.getMonth()+m); return x; }

function monthMatrix(year, month){
  const first = new Date(year, month, 1);
  const last  = new Date(year, month+1, 0);
  const days = [];
  const startOffset = (first.getDay()+6)%7;
  for(let i=0;i<startOffset;i++) days.push(null);
  for(let d=1; d<=last.getDate(); d++) days.push(new Date(year, month, d));
  while(days.length%7) days.push(null);
  return {first,last,days};
}

function hashColor(str){
  let h=0; for(const c of str) h=(h*31 + c.charCodeAt(0))>>>0;
  const hue = h % 360; const sat = 65; const lig = 55;
  return `hsl(${hue} ${sat}% ${lig}%)`;
}

function renderCalendar(monthsAhead){
  const cal = $('#calendar'); cal.innerHTML='';
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end   = addMonths(start, monthsAhead);
  const from = fmt(start), to = fmt(new Date(end.getFullYear(), end.getMonth(), 0));

  API.list(from, to).then(all => {
    const entries = all.map(e=>({
      ...e,
      start: new Date(e.start_date), end: new Date(e.end_date)
    }));

    for(let i=0;i<monthsAhead;i++){
      const mdate = addMonths(start, i);
      const {first,last,days} = monthMatrix(mdate.getFullYear(), mdate.getMonth());
      const node = document.importNode($('#tpl-month').content, true);
      node.querySelector('.month-title').textContent = first.toLocaleString('de-DE', {month:'long', year:'numeric'});
      const grid = node.querySelector('.grid-days');

      days.forEach(d => {
        const cell = document.createElement('div');
        cell.className = 'day' + (d? '' : ' is-out');
        if(d){
          const dnum = document.createElement('div'); dnum.className='dnum'; dnum.textContent=d.getDate(); cell.appendChild(dnum);
          const hit = entries.find(e => d >= new Date(e.start_date+"T00:00:00") && d <= new Date(e.end_date+"T23:59:59"));
          if(hit){
            const wrap = document.createElement('div'); wrap.className='entry';
            const badge = document.createElement('span'); badge.className='badge';
            badge.style.background = hashColor(hit.name);
            badge.innerHTML = `<span class="by">${hit.name}</span>`;
            wrap.appendChild(badge);
            if(hit.note){
              const nb = document.createElement('span'); nb.className='badge note'; nb.textContent = hit.note; wrap.appendChild(nb);
            }
            if(fmt(d) === hit.start_date){
              const del = document.createElement('button'); del.className='del tag'; del.textContent='Löschen';
              del.addEventListener('click', async ()=>{
                const code = $('#code').value.trim();
                try{ await API.del(hit.id, code); renderCalendar(parseInt($('#months').value,10)); }
                catch(err){ showMsg(err); }
              });
              wrap.appendChild(del);
            }
            cell.appendChild(wrap);
          }
        }
        grid.appendChild(cell);
      });
      cal.appendChild(node);
    }
  });
}

function showMsg(errOrText){
  const el = $('#msg');
  if(typeof errOrText === 'string'){ el.textContent = errOrText; return; }
  const e = errOrText||{}; const d = e.data||{};
  const map = {401:'Falscher Code.', 400:'Bitte Name/Zeitraum prüfen.', 409:'Konflikt: Zeitraum überschneidet sich.'};
  el.textContent = map[e.status] || 'Fehler. Bitte erneut versuchen.';
}

$('#btnAdd').addEventListener('click', async ()=>{
  const name = $('#name').value.trim();
  const start = $('#start').value; const end = $('#end').value;
  const note = $('#note').value.trim(); const code = $('#code').value.trim();
  if(!name || !start || !end) return showMsg('Bitte Name/Start/Ende ausfüllen.');
  try{ await API.add({name,start,end,note,code}); $('#msg').textContent='Gespeichert.'; renderCalendar(parseInt($('#months').value,10)); }
  catch(err){ showMsg(err); }
});

$('#btnReload').addEventListener('click', ()=> renderCalendar(parseInt($('#months').value,10)));

$('#months').value = MONTHS_AHEAD; renderCalendar(MONTHS_AHEAD);

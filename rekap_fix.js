(function(){
  if(document.body.dataset.page!=='kasir') return;
  const URL='https://kjmotqzbifxsnscvtysz.supabase.co';
  const KEY='sb_publishable_2LKsNXHeEemj9wnxr71eyw_ASH4ZFLK';
  const db=window.supabase.createClient(URL,KEY,{auth:{storageKey:'pmb_yunaji_kasir_session',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const q=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const empty=(cols,text='Belum ada data')=>`<tr><td colspan="${cols}" style="text-align:center" class="muted">${esc(text)}</td></tr>`;
  async function rpc(name,args={}){const r=await db.rpc(name,args);if(r.error)throw r.error;return r.data||[]}

  async function renderRekapSayaTables(){
    const rows=await rpc('kasir_rekap_saya_logbook');
    const detail=q('rekapRows');
    if(detail){
      detail.innerHTML=rows.length?rows.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.jam)}</td><td>${esc(x.nama_pasien)}</td><td>${esc(x.pelayanan)}</td><td>${esc(x.pelaksana)}</td></tr>`).join(''):empty(5);
      const head=detail.closest('table')?.querySelector('thead tr');
      if(head)head.innerHTML='<th>No</th><th>Jam</th><th>Nama Pasien</th><th>Jenis Pelayanan</th><th>Pelaksana</th>';
    }

    const typeRows=q('rekapTypeRows');
    if(typeRows){
      const map=new Map();
      rows.forEach(x=>{const key=String(x.pelayanan||'-');map.set(key,(map.get(key)||0)+1)});
      const items=[...map.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
      typeRows.innerHTML=items.length?items.map(([name,count],i)=>`<tr><td>${i+1}</td><td>${esc(name)}</td><td>${count}</td></tr>`).join(''):empty(3);
    }

    const patientRows=q('rekapPatientRows');
    if(patientRows){
      const seen=new Set();
      const patients=[];
      rows.forEach(x=>{const key=String(x.nama_pasien||'').trim();if(key&&!seen.has(key)){seen.add(key);patients.push(key)}});
      patientRows.innerHTML=patients.length?patients.map((name,i)=>`<tr><td>${i+1}</td><td>${esc(name)}</td></tr>`).join(''):empty(2);
    }
  }

  function patch(){
    if(typeof window.rekap!=='function'||window.__pmbRekapFix)return;
    const original=window.rekap;
    window.rekap=async function(){
      await original();
      try{
        const first=q('rekapSummary')?.querySelector('.stat span');
        if(first)first.textContent='Pasien ditangani';
        await renderRekapSayaTables();
      }catch(e){console.warn('Rekap Saya table fix:',e)}
    };
    window.__pmbRekapFix=true;
  }

  function boot(){
    patch();
    [100,500,1200,2500].forEach(ms=>setTimeout(patch,ms));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

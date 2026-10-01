(function(){
  if(document.body.dataset.page!=='kasir') return;
  const URL='https://kjmotqzbifxsnscvtysz.supabase.co';
  const KEY='sb_publishable_2LKsNXHeEemj9wnxr71eyw_ASH4ZFLK';
  const db=window.supabase.createClient(URL,KEY,{auth:{storageKey:'pmb_yunaji_kasir_session',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const q=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  async function rpc(name,args={}){const r=await db.rpc(name,args);if(r.error)throw r.error;return r.data||[]}
  const empty=(cols,text)=>`<tr><td colspan="${cols}" style="text-align:center" class="muted">${esc(text)}</td></tr>`;

  function build(){
    const panel=q('rekapPanel'); if(!panel||panel.dataset.rekapV2==='1')return; panel.dataset.rekapV2='1';
    panel.innerHTML=`
      <div class="card"><div class="card-head"><div class="section-title"><span class="icon">📊</span><div><h3>Rekap Saya</h3><p class="muted">Pisahkan pekerjaan Anda sebagai PJ/Kasir dan sebagai Pelaksana.</p></div></div></div>
        <div class="rekap-role-grid">
          <div class="role-card"><div class="role-icon">🧾</div><div><strong>Saya sebagai PJ/Kasir</strong><p>Transaksi yang saya input ke sistem.</p></div><strong id="operatorCount" class="role-count">0</strong></div>
          <div class="role-card"><div class="role-icon">🩺</div><div><strong>Saya sebagai Pelaksana</strong><p>Pelayanan yang saya lakukan kepada pasien.</p></div><strong id="performerCount" class="role-count">0</strong></div>
        </div>
      </div>
      <div class="card"><div class="section-title"><span class="icon">🧾</span><div><h3>Transaksi yang Saya Input</h3><p class="muted">Semua transaksi yang Anda masukkan sebagai PJ/Kasir.</p></div></div>
        <div class="table-wrap"><table><thead><tr><th>Jam</th><th>Jenis</th><th>Keterangan</th><th>Pelaksana</th></tr></thead><tbody id="operatorRows"></tbody></table></div>
      </div>
      <div class="card"><div class="section-title"><span class="icon">🩺</span><div><h3>Pelayanan yang Saya Lakukan</h3><p class="muted">Hanya pelayanan dengan nama Anda sebagai Pelaksana.</p></div></div>
        <div class="table-wrap"><table><thead><tr><th>Jam</th><th>Pasien</th><th>Usia</th><th>Pelayanan</th></tr></thead><tbody id="performerRows"></tbody></table></div>
      </div>`;
    if(!document.getElementById('rekapV2Styles')){
      const s=document.createElement('style');s.id='rekapV2Styles';s.textContent=`.rekap-role-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px}.role-card{display:flex;align-items:center;gap:12px;padding:16px;border:1px solid #eee6f5;border-radius:14px;background:#fbf9ff}.role-icon{font-size:25px}.role-card p{margin:4px 0 0;font-size:12px;color:#777}.role-count{margin-left:auto;font-size:24px}.table-wrap table{min-width:0}.table-wrap th,.table-wrap td{white-space:normal}@media(max-width:650px){.rekap-role-grid{grid-template-columns:1fr}.role-card{padding:13px}}`;
      document.head.appendChild(s);
    }
  }
  async function render(){
    build();
    try{
      const operatorRows=await rpc('kasir_rekap_saya_detail');
      const performerRows=await rpc('kasir_rekap_saya_logbook');
      const oc=q('operatorCount'),pc=q('performerCount'),or=q('operatorRows'),pr=q('performerRows');
      if(oc)oc.textContent=operatorRows.length;
      if(pc)pc.textContent=performerRows.length;
      if(or)or.innerHTML=operatorRows.length?operatorRows.map(x=>`<tr><td>${esc(x.waktu)}</td><td>${esc(x.jenis)}</td><td>${esc(x.keterangan)}</td><td>${esc(x.pelaksana||'-')}</td></tr>`).join(''):empty(4,'Belum ada transaksi yang Anda input hari ini.');
      if(pr)pr.innerHTML=performerRows.length?performerRows.map(x=>`<tr><td>${esc(x.jam)}</td><td>${esc(x.nama_pasien)}</td><td>${esc(x.umur)}</td><td>${esc(x.pelayanan)}</td></tr>`).join(''):empty(4,'Belum ada pelayanan yang Anda lakukan hari ini.');
    }catch(e){console.warn('Rekap V2',e)}
  }
  window.refreshRekapV2=render;
  function watchSavedMessages(){
    ['pelayananMessage','penjualanMessage','pengeluaranMessage'].forEach(id=>{
      const el=q(id); if(!el||el.dataset.rekapWatch==='1')return;
      el.dataset.rekapWatch='1';
      new MutationObserver(()=>{
        const t=(el.textContent||'').toLowerCase();
        if(t.includes('tersimpan'))setTimeout(render,250);
      }).observe(el,{childList:true,subtree:true,characterData:true});
    });
  }
  function boot(){
    [100,700,1800,3000].forEach(ms=>setTimeout(render,ms));
    setTimeout(watchSavedMessages,500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

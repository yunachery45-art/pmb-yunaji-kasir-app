(function(){
  if(document.body.dataset.page!=='kasir') return;
  const URL='https://kjmotqzbifxsnscvtysz.supabase.co';
  const KEY='sb_publishable_2LKsNXHeEemj9wnxr71eyw_ASH4ZFLK';
  const db=window.supabase.createClient(URL,KEY,{auth:{storageKey:'pmb_yunaji_kasir_session',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const q=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const empty=(cols,text='Belum ada pelayanan hari ini')=>`<tr><td colspan="${cols}" style="text-align:center" class="muted">${esc(text)}</td></tr>`;
  async function rpc(name,args={}){const r=await db.rpc(name,args);if(r.error)throw r.error;return r.data||[]}

  function buildSimpleRekap(){
    const panel=q('rekapPanel');
    if(!panel || panel.dataset.simpleRekap==='1') return;
    panel.dataset.simpleRekap='1';
    panel.innerHTML=`
      <div class="card">
        <div class="card-head">
          <div class="section-title"><span class="icon">📊</span><div>
            <h3>Rekap Saya</h3>
            <p class="muted">Ringkasan pekerjaan Anda sebagai pelaksana hari ini.</p>
          </div></div>
        </div>
        <div id="rekapSummary" class="kpi-grid">
          <div class="kpi-card accent-pink"><div class="kpi-icon">👥</div><span>Pasien saya</span><strong>0</strong></div>
          <div class="kpi-card accent-blue"><div class="kpi-icon">🩺</div><span>Pelayanan saya</span><strong>0</strong></div>
        </div>
      </div>
      <div class="card">
        <div class="section-title"><span class="icon">🩺</span><div>
          <h3>Pelayanan yang Saya Tangani</h3>
          <p class="muted">Daftar pasien dan pelayanan yang Anda lakukan hari ini.</p>
        </div></div>
        <div class="table-wrap simple-rekap-table"><table><thead><tr><th>Jam</th><th>Pasien</th><th>Pelayanan</th></tr></thead><tbody id="rekapRows"></tbody></table></div>
      </div>
      <div class="card">
        <div class="section-title"><span class="icon">👤</span><div>
          <h3>Pasien Saya Hari Ini</h3>
          <p class="muted">Ringkasan singkat pasien yang Anda tangani.</p>
        </div></div>
        <div id="rekapPatientList" class="simple-patient-list"></div>
      </div>`;
  }

  async function renderSimpleRekap(){
    buildSimpleRekap();
    const rows=await rpc('kasir_rekap_saya_logbook');
    const uniquePatients=[];
    const seen=new Set();
    rows.forEach(x=>{
      const name=String(x.nama_pasien||'').trim();
      if(name && !seen.has(name)){seen.add(name);uniquePatients.push(name)}
    });

    const summary=q('rekapSummary');
    if(summary){
      summary.innerHTML=`
        <div class="kpi-card accent-pink"><div class="kpi-icon">👥</div><span>Pasien saya</span><strong>${uniquePatients.length}</strong></div>
        <div class="kpi-card accent-blue"><div class="kpi-icon">🩺</div><span>Pelayanan saya</span><strong>${rows.length}</strong></div>`;
    }

    const detail=q('rekapRows');
    if(detail){
      detail.innerHTML=rows.length?rows.map(x=>`<tr><td>${esc(x.jam)}</td><td>${esc(x.nama_pasien)}</td><td>${esc(x.pelayanan)}</td></tr>`).join(''):empty(3);
    }

    const patients=q('rekapPatientList');
    if(patients){
      patients.innerHTML=uniquePatients.length?uniquePatients.map((name,i)=>`<div class="simple-patient-item"><span class="patient-number">${i+1}</span><strong>${esc(name)}</strong></div>`).join(''):'<p class="muted">Belum ada pasien yang Anda tangani hari ini.</p>';
    }
  }

  function patch(){
    if(typeof window.rekap!=='function' || window.__pmbSimpleRekap)return;
    const original=window.rekap;
    window.rekap=async function(){
      try{await original()}catch(e){console.warn('Rekap dasar:',e)}
      try{await renderSimpleRekap()}catch(e){console.warn('Rekap Saya sederhana:',e)}
    };
    window.__pmbSimpleRekap=true;
    buildSimpleRekap();
  }

  function addStyles(){
    if(document.getElementById('simpleRekapStyles'))return;
    const s=document.createElement('style');s.id='simpleRekapStyles';
    s.textContent=`
      #rekapPanel .kpi-grid{grid-template-columns:repeat(2,1fr)}
      #rekapPanel .simple-rekap-table table{min-width:0}
      #rekapPanel .simple-rekap-table th,#rekapPanel .simple-rekap-table td{white-space:normal}
      #rekapPanel .simple-patient-list{display:flex;flex-direction:column;gap:8px}
      #rekapPanel .simple-patient-item{display:flex;align-items:center;gap:10px;padding:11px 12px;border:1px solid #eee6f5;border-radius:11px;background:#fbf9ff}
      #rekapPanel .patient-number{width:25px;height:25px;display:grid;place-items:center;border-radius:50%;background:#eee5ff;color:#6d30d4;font-weight:900;font-size:11px}
      @media(max-width:760px){#rekapPanel .kpi-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:460px){#rekapPanel .kpi-grid{gap:8px}#rekapPanel .kpi-card{padding:13px}}
    `;
    document.head.appendChild(s);
  }

  function boot(){
    addStyles();
    patch();
    [100,500,1200,2500].forEach(ms=>setTimeout(()=>{addStyles();patch();if(window.__pmbSimpleRekap)renderSimpleRekap().catch(()=>{})},ms));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

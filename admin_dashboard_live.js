(function(){
  if(document.body.dataset.page!=='admin') return;
  const q=id=>document.getElementById(id);
  const escv=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  const num=n=>new Intl.NumberFormat('id-ID').format(Number(n)||0);
  async function load(){
    try{
      const from=q('reportFrom')?.value||today();
      const to=q('reportTo')?.value||today();
      const data=await rpc('kasir_admin_dashboard_detail',{p_mulai:from,p_selesai:to});
      render(data||{});
    }catch(e){
      const el=q('dashboardMessage');
      if(el) el.textContent='Dashboard detail gagal dimuat: '+(e.message||e);
      console.error('admin dashboard detail',e);
    }
  }
  function render(data){
    const stats=q('dashboardStats');
    if(!stats) return;
    stats.classList.add('admin-kpi-grid');
    const old=document.querySelector('#dashboardPanel .dashboard-live-layout');
    if(old) old.remove();
    const pel=Array.isArray(data.pelaksana)?data.pelaksana:[];
    const srv=Array.isArray(data.pelayanan)?data.pelayanan:[];
    const pay=Array.isArray(data.pembayaran)?data.pembayaran:[];
    const wrap=document.createElement('div');
    wrap.className='dashboard-layout dashboard-live-layout';
    wrap.innerHTML=`
      <section class="card dashboard-chart-card">
        <div class="section-title"><span class="icon">📊</span><h3>Rekap Pelayanan per Pelaksana</h3></div>
        <div class="live-bar-chart">${barRows(pel)}</div>
        <p class="muted dashboard-note">Data mengikuti transaksi pelayanan pada periode yang dipilih.</p>
      </section>
      <section class="card dashboard-chart-card">
        <div class="section-title"><span class="icon">🩺</span><h3>Rekap Jenis Pelayanan</h3></div>
        ${donut(srv)}
      </section>
      <section class="card dashboard-wide">
        <div class="section-title"><span class="icon">💳</span><h3>Rekap Metode Pembayaran</h3></div>
        <div class="table-wrap"><table><thead><tr><th>No</th><th>Metode</th><th>Jumlah Transaksi</th><th>Total Nominal</th></tr></thead><tbody>${paymentRows(pay)}</tbody></table></div>
      </section>`;
    stats.parentElement.insertAdjacentElement('afterend',wrap);
  }
  function barRows(rows){
    if(!rows.length) return '<div class="dashboard-empty">Belum ada pelayanan pada periode ini.</div>';
    const max=Math.max(...rows.map(x=>Number(x.jumlah_pelayanan)||0),1);
    return rows.slice(0,8).map(x=>`<div class="live-bar-row"><div class="live-bar-name">${escv(x.pelaksana)}</div><div class="live-bar-track"><span style="width:${Math.max(4,Math.round((Number(x.jumlah_pelayanan)||0)/max*100))}%"></span></div><strong>${num(x.jumlah_pelayanan)}</strong><small>${money(x.total_nominal)}</small></div>`).join('');
  }
  function donut(rows){
    if(!rows.length) return '<div class="dashboard-empty">Belum ada pelayanan pada periode ini.</div>';
    const total=rows.reduce((a,x)=>a+(Number(x.jumlah)||0),0);
    let cursor=0;
    const colors=['#6f25d9','#ec2d9a','#4f83e1','#43b88f','#f0a04b','#7b8794','#c75cff','#35a7d9'];
    const stops=rows.slice(0,8).map((x,i)=>{const start=cursor/total*100;cursor+=(Number(x.jumlah)||0);const end=cursor/total*100;return `${colors[i%colors.length]} ${start}% ${end}%`}).join(',');
    return `<div class="live-donut-wrap"><div class="live-donut" style="background:conic-gradient(${stops})"><div class="live-donut-center"><strong>${num(total)}</strong><small>Pelayanan</small></div></div><div class="live-legend">${rows.slice(0,8).map((x,i)=>`<div class="live-legend-row"><span><i style="background:${colors[i%colors.length]}"></i>${escv(x.pelayanan)}</span><b>${num(x.jumlah)}</b></div>`).join('')}</div></div>`;
  }
  function paymentRows(rows){
    if(!rows.length) return '<tr><td colspan="4">Belum ada transaksi pada periode ini.</td></tr>';
    return rows.map((x,i)=>`<tr><td>${i+1}</td><td>${escv(x.metode)}</td><td>${num(x.jumlah_transaksi)}</td><td>${money(x.total_nominal)}</td></tr>`).join('');
  }
  function install(){
    if(typeof window.rpc!=='function') return setTimeout(install,200);
    const btn=q('reportBtn');
    if(btn && !btn.dataset.liveDashboard){
      const old=btn.onclick;
      btn.onclick=async function(){if(typeof old==='function') await old();await load()};
      btn.dataset.liveDashboard='1';
    }
    load();
  }
  const style=document.createElement('style');
  style.textContent=`
    .dashboard-live-layout{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.85fr);gap:16px;margin-top:16px}
    .dashboard-live-layout .dashboard-wide{grid-column:1/-1}
    .dashboard-chart-card{min-height:300px}
    .live-bar-chart{display:grid;gap:14px;margin-top:18px}
    .live-bar-row{display:grid;grid-template-columns:130px 1fr 42px 110px;gap:10px;align-items:center;font-size:12px}
    .live-bar-name{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .live-bar-track{height:13px;background:#eeeaf7;border-radius:999px;overflow:hidden}
    .live-bar-track span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#6f25d9,#ec2d9a)}
    .live-bar-row strong{text-align:right}.live-bar-row small{text-align:right;color:#697386}
    .live-donut-wrap{display:grid;grid-template-columns:190px 1fr;gap:18px;align-items:center;margin-top:14px}
    .live-donut{width:180px;height:180px;border-radius:50%;display:grid;place-items:center}
    .live-donut:before{content:'';width:108px;height:108px;border-radius:50%;background:#fff;grid-area:1/1}
    .live-donut-center{grid-area:1/1;z-index:1;text-align:center;display:flex;flex-direction:column;align-items:center}
    .live-donut-center strong{font-size:24px}.live-donut-center small{color:#697386}
    .live-legend{display:grid;gap:9px}.live-legend-row{display:flex;justify-content:space-between;gap:12px;font-size:12px}.live-legend-row span{display:flex;align-items:center;gap:7px}.live-legend-row i{width:10px;height:10px;border-radius:50%;display:inline-block}
    .dashboard-empty{padding:36px 12px;text-align:center;color:#697386}
    .dashboard-note{font-size:11px;margin-top:20px}
    @media(max-width:800px){.dashboard-live-layout{grid-template-columns:1fr}.dashboard-live-layout .dashboard-wide{grid-column:auto}.live-bar-row{grid-template-columns:100px 1fr 35px}.live-bar-row small{grid-column:2/-1;text-align:left}.live-donut-wrap{grid-template-columns:1fr;justify-items:center}.live-legend{width:100%}}
  `;
  document.head.appendChild(style);
  document.addEventListener('pmb-admin-ready',()=>setTimeout(install,80));
  document.addEventListener('DOMContentLoaded',()=>setTimeout(install,700));
})();

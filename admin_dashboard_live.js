(function(){
  if(window.__yunajiDashboardRendererLoaded) return;
  window.__yunajiDashboardRendererLoaded=true;
  if(document.body.dataset.page!=='admin') return;
  const q=id=>document.getElementById(id);
  const escv=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  const num=n=>new Intl.NumberFormat('id-ID').format(Number(n)||0);
  const todayLabel=()=>new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(new Date());

  function icon(kind){
    const icons={patient:'👥',service:'▣',done:'✓',income:'▤',expense:'▤',balance:'▥',chart:'▦',clinic:'▣',pay:'▤'};
    return `<span class="yunaji-kpi-icon">${icons[kind]||'•'}</span>`;
  }

  async function load(){
    try{
      if(typeof window.rpc!=='function') return setTimeout(load,250);
      const from=q('reportFrom')?.value||today();
      const to=q('reportTo')?.value||today();
      const [ui,detail,pelaksana,transactions]=await Promise.all([
        rpc('kasir_admin_dashboard_ui',{p_mulai:from,p_selesai:to}),
        rpc('kasir_admin_dashboard_detail',{p_mulai:from,p_selesai:to}),
        rpc('kasir_admin_rekap_pelaksana',{p_mulai:from,p_selesai:to,p_pelaksana_id:null}),
        rpc('kasir_admin_transaksi_final',{p_mulai:from,p_selesai:to,p_subjenis:'PELAYANAN'})
      ]);
      render((ui||[])[0]||{},detail||{},pelaksana||[],transactions||[]);
    }catch(e){
      const el=q('dashboardMessage');
      if(el) el.textContent='Dashboard gagal dimuat: '+(e.message||e);
      console.error('admin dashboard',e);
    }
  }

  function render(ui,data,pelaksana,transactions){
    const stats=q('dashboardStats');
    if(!stats) return;
    const welcome=document.querySelector('#dashboardPanel .welcome-card');
    if(welcome) welcome.style.display='none';
    const filterCard=q('reportFrom')?.closest('.card');
    if(filterCard){
      const filter=filterCard.querySelector('.report-filter');
      if(filter) filter.style.display='none';
      filterCard.style.boxShadow='none';
      filterCard.style.border='0';
      filterCard.style.padding='0';
      filterCard.style.background='transparent';
      filterCard.style.marginBottom='10px';
    }
    stats.className='yunaji-kpi-grid';
    stats.innerHTML=`${kpi('Total Pasien',num(ui.total_pasien),'patient','pink')}${kpi('Total Pelayanan',num(ui.total_pelayanan),'service','blue')}${kpi('Pelayanan Selesai',num(ui.pelayanan_selesai),'done','green')}${kpi('Total Pemasukan',money(ui.total_pemasukan),'income','orange')}${kpi('Total Pengeluaran',money(ui.total_pengeluaran),'expense','red')}${kpi('Saldo Kas',money(ui.saldo_kas),'balance','purple')}`;
    let old=document.querySelector('#dashboardPanel .yunaji-dashboard-layout');
    if(old) old.remove();
    const pel=Array.isArray(pelaksana)?pelaksana:[];
    const srv=Array.isArray(data.pelayanan)?data.pelayanan:[];
    const pay=Array.isArray(data.pembayaran)?data.pembayaran:[];
    const wrap=document.createElement('div');
    wrap.className='yunaji-dashboard-layout';
    wrap.innerHTML=`
      <section class="card yunaji-panel service-panel"><div class="yunaji-panel-title"><span class="yunaji-title-icon">▣</span><h3>Rekap Pelayanan per Pelaksana</h3></div>${barChart(pel)}</section>
      <section class="card yunaji-panel service-type-panel"><div class="yunaji-panel-title"><span class="yunaji-title-icon">▣</span><h3>Rekap Jenis Pelayanan</h3></div>${donut(srv)}</section>
      <section class="card yunaji-panel payment-panel"><div class="yunaji-panel-title"><span class="yunaji-title-icon">▣</span><h3>Rekap Metode Pembayaran</h3></div><div class="table-wrap yunaji-payment-table"><table><thead><tr><th>No</th><th>Metode</th><th>Jumlah Transaksi</th><th>Total Nominal</th></tr></thead><tbody>${paymentRows(pay)}</tbody></table></div></section>
      <section class="card yunaji-panel detail-panel"><div class="yunaji-detail-head"><div class="yunaji-panel-title"><span class="yunaji-title-icon">▣</span><h3>Detail Pelayanan per Pelaksana</h3></div><button class="yunaji-export" type="button" onclick="window.print()">▣&nbsp; Export Excel</button></div><div class="table-wrap yunaji-detail-table"><table><thead><tr><th>No</th><th>Tanggal</th><th>Jam</th><th>Nama Pasien</th><th>Jenis Pelayanan</th><th>Pelaksana</th><th>PJ Kasir</th><th>Metode</th><th>Nominal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${detailRows(transactions)}</tbody></table></div></section>`;
    stats.parentElement.insertAdjacentElement('afterend',wrap);
    installDateChip();
    installDetailButtons();
  }

  function kpi(label,value,kind,tone){return `<div class="yunaji-kpi ${tone}">${icon(kind)}<div><span>${escv(label)}</span><strong>${escv(value)}</strong></div></div>`;}

  function barChart(rows){
    if(!rows.length) return '<div class="yunaji-empty">Belum ada pelayanan pada periode ini.</div>';
    const max=Math.max(...rows.map(x=>Math.max(Number(x.jumlah_pasien)||0,Number(x.jumlah_pelayanan)||0)),1);
    return `<div class="yunaji-bars"><div class="yunaji-legend-top"><span><i class="legend-purple"></i>Jumlah Pasien</span><span><i class="legend-pink"></i>Jumlah Pelayanan</span></div><div class="yunaji-bars-area">${rows.slice(0,8).map(x=>{const pasien=Number(x.jumlah_pasien)||0,pelayanan=Number(x.jumlah_pelayanan)||0;const hp=Math.max(8,Math.round(pasien/max*100)),hs=Math.max(8,Math.round(pelayanan/max*100));return `<div class="yunaji-bar-group"><div class="yunaji-bar-pair"><div class="yunaji-value-bar purple" style="height:${hp}%"><b>${num(pasien)}</b></div><div class="yunaji-value-bar pink" style="height:${hs}%"><b>${num(pelayanan)}</b></div></div><div class="yunaji-bar-name">${escv(x.pelaksana||'-')}</div></div>`;}).join('')}</div></div>`;
  }

  function donut(rows){
    if(!rows.length) return '<div class="yunaji-empty">Belum ada pelayanan pada periode ini.</div>';
    const clean=rows.slice(0,8).map(x=>({name:x.pelayanan||'-',count:Number(x.jumlah)||0,nominal:Number(x.nominal)||0}));
    const total=clean.reduce((a,x)=>a+x.count,0);
    if(!total) return '<div class="yunaji-empty">Belum ada pelayanan pada periode ini.</div>';
    const colors=['#6f25d9','#ec2d9a','#4f83e1','#43b88f','#f0a04b','#6aa890','#c75cff','#9aa0aa'];
    let cursor=0;const stops=clean.map((x,i)=>{const a=cursor/total*100;cursor+=x.count;const b=cursor/total*100;return `${colors[i]} ${a}% ${b}%`;}).join(',');
    return `<div class="yunaji-donut-layout"><div class="yunaji-donut" style="background:conic-gradient(${stops})"><div class="yunaji-donut-hole"><strong>${num(total)}</strong><small>Pelayanan</small></div></div><div class="yunaji-service-list">${clean.map((x,i)=>`<div class="yunaji-service-row"><span><i style="background:${colors[i]}"></i>${escv(x.name)}</span><b>${num(x.count)} (${Math.round(x.count/total*100)}%)</b></div>`).join('')}</div></div>`;
  }

  function paymentRows(rows){if(!rows.length)return '<tr><td colspan="4">Belum ada transaksi pada periode ini.</td></tr>';return rows.map((x,i)=>`<tr><td>${i+1}</td><td>${escv(x.metode||'-')}</td><td>${num(x.jumlah_transaksi)}</td><td>${money(x.total_nominal)}</td></tr>`).join('');}

  function detailRows(rows){
    if(!rows.length) return '<tr><td colspan="11">Belum ada pelayanan pada periode ini.</td></tr>';
    return rows.slice(0,100).map((x,i)=>{const d=new Date(x.tanggal);const date=new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',day:'2-digit',month:'2-digit'}).format(d);const time=new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);const payload=encodeURIComponent(JSON.stringify({pasien:x.pasien||'-',pelayanan:x.kategori||'-',pelaksana:x.pelaksana||'-',operator:x.operator||'-',metode:x.metode||'-',nominal:money(x.nominal),tanggal:date+' '+time}));return `<tr><td>${i+1}</td><td>${date}</td><td>${time}</td><td>${escv(x.pasien||'-')}</td><td>${escv(x.kategori||'-')}</td><td>${escv(x.pelaksana||'-')}</td><td>${escv(x.operator||'-')}</td><td>${escv(x.metode||'-')}</td><td>${money(x.nominal)}</td><td><span class="yunaji-status">● Selesai</span></td><td><button class="yunaji-detail-btn" type="button" data-detail="${payload}">Detail</button></td></tr>`;}).join('');
  }

  function installDetailButtons(){document.querySelectorAll('.yunaji-detail-btn').forEach(btn=>{if(btn.dataset.bound)return;btn.dataset.bound='1';btn.addEventListener('click',()=>{const d=JSON.parse(decodeURIComponent(btn.dataset.detail||'%7B%7D'));alert(`Pasien: ${d.pasien}\nPelayanan: ${d.pelayanan}\nPelaksana: ${d.pelaksana}\nPJ Kasir: ${d.operator}\nMetode: ${d.metode}\nNominal: ${d.nominal}\nTanggal: ${d.tanggal}`);});});}
  function installDateChip(){const actions=document.querySelector('.top-actions');if(!actions||actions.querySelector('.yunaji-date-chip'))return;const chip=document.createElement('span');chip.className='yunaji-date-chip';chip.innerHTML=`<span>▣</span> ${escv(todayLabel())}`;actions.insertBefore(chip,actions.firstChild);}

  const style=document.createElement('style');
  style.textContent=`
    #dashboardPanel{margin-top:-6px}#dashboardPanel>.card{margin-bottom:8px}
    .yunaji-kpi-grid{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin:0!important;padding:0!important;background:transparent!important}
    .yunaji-kpi{min-height:72px;border:1px solid #eee4f5;border-radius:11px;padding:10px 12px;display:flex;align-items:center;gap:10px;background:#fff;box-shadow:0 3px 12px rgba(61,31,88,.05)}.yunaji-kpi>div{min-width:0}.yunaji-kpi span{display:block;font-size:10px;color:#5f5870;font-weight:700;white-space:nowrap}.yunaji-kpi strong{display:block;margin-top:1px;font-size:18px;color:#21174e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.yunaji-kpi-icon{width:35px;height:35px;flex:0 0 35px;border-radius:9px;display:grid;place-items:center;font-size:20px;font-weight:900}.yunaji-kpi.pink .yunaji-kpi-icon{background:#f9d9ed;color:#e31b88}.yunaji-kpi.blue .yunaji-kpi-icon{background:#d9e7ff;color:#1d63db}.yunaji-kpi.green .yunaji-kpi-icon{background:#d8f4e6;color:#10a765}.yunaji-kpi.orange .yunaji-kpi-icon{background:#fff0c9;color:#ed9d00}.yunaji-kpi.red .yunaji-kpi-icon{background:#ffdce3;color:#e63d4e}.yunaji-kpi.purple .yunaji-kpi-icon{background:#eadcff;color:#6e25dd}
    .yunaji-dashboard-layout{display:grid;grid-template-columns:1.38fr .92fr 1fr;gap:10px;margin-top:0}.yunaji-panel{min-width:0;padding:13px 14px!important;border-radius:11px!important;box-shadow:0 4px 14px rgba(61,31,88,.055)!important}.yunaji-panel-title{display:flex;align-items:center;gap:7px;margin-bottom:7px}.yunaji-panel-title h3{margin:0;font-size:12px;color:#3a3152}.yunaji-title-icon{width:23px;height:23px;border-radius:6px;display:grid;place-items:center;background:#efe1ff;color:#6f25d9;font-size:13px;font-weight:900}.service-panel{grid-column:1}.service-type-panel{grid-column:2}.payment-panel{grid-column:3}.detail-panel{grid-column:1/-1}
    .yunaji-bars{height:190px}.yunaji-legend-top{display:flex;justify-content:center;gap:14px;font-size:9px;color:#686174;margin:1px 0 5px}.yunaji-legend-top span{display:flex;align-items:center;gap:4px}.yunaji-legend-top i{width:8px;height:8px;border-radius:2px;display:inline-block}.legend-purple{background:#6f25d9}.legend-pink{background:#ec2d9a}.yunaji-bars-area{height:156px;display:flex;align-items:end;gap:15px;padding:5px 10px 0;border-bottom:1px solid #eee7f3}.yunaji-bar-group{height:100%;flex:1;min-width:45px;display:flex;flex-direction:column;align-items:center;justify-content:end}.yunaji-bar-pair{height:132px;display:flex;align-items:end;gap:3px}.yunaji-value-bar{width:18px;min-height:5px;border-radius:5px 5px 1px 1px;position:relative;display:flex;align-items:flex-start;justify-content:center;transition:.2s}.yunaji-value-bar b{position:absolute;top:-14px;font-size:9px;color:#4c425d}.yunaji-value-bar.purple{background:linear-gradient(180deg,#7652e7,#4f35ca)}.yunaji-value-bar.pink{background:linear-gradient(180deg,#ec62b7,#d53aa0)}.yunaji-bar-name{font-size:9px;color:#4f485e;margin-top:5px;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
    .yunaji-donut-layout{display:grid;grid-template-columns:145px 1fr;gap:12px;align-items:center;min-height:190px}.yunaji-donut{width:145px;height:145px;border-radius:50%;display:grid;place-items:center;position:relative}.yunaji-donut-hole{width:88px;height:88px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#302451;box-shadow:0 0 0 1px rgba(60,30,90,.03)}.yunaji-donut-hole strong{font-size:20px}.yunaji-donut-hole small{font-size:9px;color:#777080}.yunaji-service-list{display:grid;gap:7px}.yunaji-service-row{display:flex;justify-content:space-between;gap:8px;font-size:9px;border-bottom:1px solid #f0ebf4;padding-bottom:5px}.yunaji-service-row span{display:flex;align-items:center;gap:5px;min-width:0}.yunaji-service-row i{width:8px;height:8px;border-radius:2px;flex:0 0 8px}.yunaji-service-row b{font-size:9px;color:#514862;white-space:nowrap}
    .payment-panel .yunaji-panel-title{margin-bottom:5px}.yunaji-payment-table{margin-top:0;border:0;border-radius:0;box-shadow:none!important}.yunaji-payment-table table{min-width:0;font-size:9px}.yunaji-payment-table th,.yunaji-payment-table td{padding:7px 5px}.yunaji-payment-table th{background:#fff0f8;color:#514862;font-size:9px}.yunaji-payment-table tr:last-child td{border-bottom:0}
    .detail-panel{padding-bottom:9px!important}.yunaji-detail-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.yunaji-detail-head .yunaji-panel-title{margin-bottom:0}.yunaji-export{width:auto!important;margin:0!important;padding:6px 10px!important;background:#fff!important;color:#1d8f5a!important;border:1px solid #72c99b!important;border-radius:6px!important;font-size:9px!important}.yunaji-detail-table{margin-top:7px;max-height:255px;overflow:auto}.yunaji-detail-table table{min-width:1000px;font-size:9px}.yunaji-detail-table th,.yunaji-detail-table td{padding:7px 6px}.yunaji-detail-table th{background:#ffeef8;color:#514862;font-size:9px}.yunaji-status{display:inline-block;color:#168c58;font-weight:800;white-space:nowrap}.yunaji-detail-btn{width:auto!important;margin:0!important;padding:3px 7px!important;background:transparent!important;color:#6530c8!important;font-size:9px!important;font-weight:800!important}.yunaji-date-chip{display:inline-flex;align-items:center;gap:5px;padding:7px 9px;border-radius:8px;background:#fff7fd;border:1px solid #eee0f0;color:#575064;font-size:9px;font-weight:800;white-space:nowrap}.yunaji-date-chip span{color:#6f25d9}.yunaji-empty{min-height:180px;display:grid;place-items:center;color:#81798c;font-size:11px}
    @media(max-width:1150px){.yunaji-kpi-grid{grid-template-columns:repeat(3,1fr)}.yunaji-dashboard-layout{grid-template-columns:1fr 1fr}.payment-panel{grid-column:1/-1}.service-panel,.service-type-panel{grid-column:auto}}@media(max-width:760px){.yunaji-kpi-grid{grid-template-columns:1fr 1fr}.yunaji-dashboard-layout{grid-template-columns:1fr}.service-panel,.service-type-panel,.payment-panel,.detail-panel{grid-column:auto}.yunaji-donut-layout{grid-template-columns:1fr;justify-items:center}.yunaji-service-list{width:100%}.yunaji-date-chip{display:none}}@media(max-width:460px){.yunaji-kpi-grid{grid-template-columns:1fr}.yunaji-bars-area{gap:8px}.yunaji-value-bar{width:14px}}
  `;
  document.head.appendChild(style);

  function install(){
    if(typeof window.rpc!=='function') return setTimeout(install,200);
    const btn=q('reportBtn');
    if(btn && !btn.dataset.yunajiDashboard){btn.addEventListener('click',()=>setTimeout(load,150));btn.dataset.yunajiDashboard='1';}
    load();
  }
  document.addEventListener('pmb-admin-ready',()=>setTimeout(install,80));
  document.addEventListener('DOMContentLoaded',()=>setTimeout(install,700));
})();

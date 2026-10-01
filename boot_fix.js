(function(){
  function filterRekapSayaRows(){
    try{
      if(document.body.dataset.page!=='kasir')return;
      const activeName=String(document.getElementById('operatorLabel')?.textContent||document.getElementById('welcomeName')?.textContent||'').trim().toLowerCase();
      const tbody=document.getElementById('rekapRows');
      if(!tbody||!activeName)return;
      Array.from(tbody.querySelectorAll('tr')).forEach(function(row){
        const cells=row.querySelectorAll('td');
        const pelaksana=String(cells[3]?.textContent||'').trim().toLowerCase();
        row.style.display=(pelaksana===activeName)?'':'none';
      });
    }catch(e){console.warn('Rekap Saya filter failed',e)}
  }
  function patchRekap(){
    if(typeof window.rekap==='function' && !window.__pmbRekapPatched){
      const original=window.rekap;
      window.rekap=async function(){
        await original();
        filterRekapSayaRows();
      };
      window.__pmbRekapPatched=true;
    }
  }
  function boot(){
    patchRekap();
    if(document.body.dataset.page==='kasir' && typeof window.initKasir==='function' && !window.__pmbKasirBooted){
      window.__pmbKasirBooted=true;
      window.initKasir().catch(function(e){
        const el=document.getElementById('loginMessage');
        if(el)el.textContent='Aplikasi gagal dimuat: '+(e?.message||e);
        console.error('Kasir boot failed',e);
      });
    }
    if(document.body.dataset.page==='admin' && typeof window.initAdmin==='function' && !window.__pmbAdminBooted){
      window.__pmbAdminBooted=true;
      window.initAdmin().catch(function(e){
        const el=document.getElementById('adminMessage')||document.getElementById('loginMessage');
        if(el)el.textContent='Admin gagal dimuat: '+(e?.message||e);
        console.error('Admin boot failed',e);
      });
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

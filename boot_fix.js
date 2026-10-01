(function(){
  async function filterRekapSaya(){
    try{
      if(document.body.dataset.page!=='kasir')return;
      const current=(await window.db?.rpc?.('kasir_current_operator'))?.data?.[0];
      if(!current)return;
      const rows=(await window.db?.rpc?.('kasir_rekap_saya_detail'))?.data||[];
      const activeName=String(current.staff_name||'').trim().toLowerCase();
      const own=rows.filter(function(x){
        return String(x.pelaksana||'').trim().toLowerCase()===activeName;
      });
      const tbody=document.getElementById('rekapRows');
      if(tbody)tbody.innerHTML=own.map(function(x){
        const esc=window.esc||function(v){return String(v??'').replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]})};
        return '<tr><td>'+esc(x.waktu)+'</td><td>'+esc(x.jenis)+'</td><td>'+esc(x.keterangan)+'</td><td>'+esc(x.pelaksana||'-')+'</td></tr>';
      }).join('');
    }catch(e){console.warn('Rekap Saya filter failed',e)}
  }
  function patchRekap(){
    if(typeof window.rekap==='function' && !window.__pmbRekapPatched){
      const original=window.rekap;
      window.rekap=async function(){
        await original();
        await filterRekapSaya();
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

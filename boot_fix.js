(function(){
  function boot(){
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

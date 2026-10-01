(function(){
  if(document.body.dataset.page!=='kasir') return;
  function wrapForm(id){
    const form=document.getElementById(id);
    if(!form || form.dataset.liveRefreshWrapped==='1') return;
    const original=form.onsubmit;
    if(typeof original!=='function') return;
    form.dataset.liveRefreshWrapped='1';
    form.onsubmit=async function(e){
      await original.call(this,e);
      if(window.refreshRekapV2){
        await new Promise(r=>setTimeout(r,50));
        await window.refreshRekapV2();
      }
    };
  }
  function boot(){
    ['pelayananForm','penjualanForm','pengeluaranForm'].forEach(wrapForm);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  setTimeout(boot,300);
  setTimeout(boot,1000);
})();

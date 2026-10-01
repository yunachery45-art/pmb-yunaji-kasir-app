(function(){
  if(document.body.dataset.page!=='kasir') return;
  const refresh=()=>{if(typeof window.refreshRekapV2==='function') window.refreshRekapV2();};
  let timer=0;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(refresh,1200);setTimeout(refresh,2500);};
  document.addEventListener('submit',function(e){
    if(e.target && /Form$/.test(e.target.id||'')) schedule();
  },true);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
  window.addEventListener('focus',refresh);
  setInterval(()=>{if(!document.hidden && document.visibilityState==='visible')refresh()},5000);
})();

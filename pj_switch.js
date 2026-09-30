(function(){
  function showMessage(text){
    const el=document.getElementById('cashMessage')||document.getElementById('loginMessage');
    if(el)el.textContent=text||'';
  }

  function triggerHandover(){
    const takeover=document.getElementById('takeoverBtn');
    if(takeover){takeover.click();return true}
    const badge=(document.getElementById('cashBadge')?.textContent||'').trim().toUpperCase();
    if(badge==='DITUTUP'){
      showMessage('Kas hari ini sudah ditutup. Pergantian PJ tidak diperlukan lagi untuk transaksi.');
    }else{
      showMessage('Kas belum dibuka. Silakan buka kas terlebih dahulu, lalu gunakan Ganti PJ.');
    }
    return false;
  }

  function bindSwitch(){
    const b=document.getElementById('switchPjBtn');
    if(b&&!b.dataset.pjSwitchBound){
      b.dataset.pjSwitchBound='1';
      b.onclick=triggerHandover;
    }
    const side=document.querySelector('.logout-side');
    if(side&&!side.dataset.pjSwitchBound){
      side.dataset.pjSwitchBound='1';
      side.removeAttribute('onclick');
      side.onclick=triggerHandover;
    }
  }

  window.addEventListener('DOMContentLoaded',()=>{
    bindSwitch();
    [300,1000,2000].forEach(ms=>setTimeout(bindSwitch,ms));
  });
})();

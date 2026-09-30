(function(){
  if(window.__pmbLoginFixInstalled)return;
  window.__pmbLoginFixInstalled=true;

  async function openCashier(staffId, button){
    const message=document.getElementById('loginMessage');
    const buttons=[...document.querySelectorAll('#staffChoices .choice-btn')];
    buttons.forEach(b=>b.disabled=true);
    if(message)message.textContent='Membuka sesi kasir...';
    try{
      const old=(await db.auth.getSession()).data.session;
      if(old)await db.auth.signOut({scope:'local'});

      const auth=await db.auth.signInAnonymously();
      if(auth.error)throw auth.error;

      await rpc('kasir_set_operator',{p_staff_id:staffId});

      const current=(await rpc('kasir_current_operator'))?.[0];
      if(!current)throw new Error('Sesi kasir berhasil dibuat tetapi PJ aktif belum terbaca.');

      document.getElementById('loginView')?.classList.add('hidden');
      document.getElementById('appView')?.classList.remove('hidden');
      document.getElementById('welcomeName').textContent=current.staff_name;
      document.getElementById('operatorLabel').textContent=current.staff_name;

      const jobs=[
        ['Data master',()=>masters()],
        ['Status kas',()=>cashStatus()],
        ['PJ aktif',()=>renderPjHandover()],
        ['Rekap',()=>rekap()],
        ['Pasien hari ini',()=>patients()]
      ];
      for(const [label,job] of jobs){
        try{await job();}
        catch(e){console.error('Kasir boot '+label,e);}
      }
    }catch(e){
      console.error('Cashier login failed',e);
      if(message)message.textContent='Login gagal: '+(e?.message||e);
      try{await db.auth.signOut({scope:'local'})}catch{}
      document.getElementById('loginView')?.classList.remove('hidden');
      document.getElementById('appView')?.classList.add('hidden');
    }finally{
      buttons.forEach(b=>b.disabled=false);
    }
  }

  function install(){
    document.addEventListener('click',function(ev){
      const button=ev.target.closest?.('#staffChoices .choice-btn');
      if(!button)return;
      const id=Number(button.dataset.id);
      if(!id)return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      openCashier(id,button);
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();

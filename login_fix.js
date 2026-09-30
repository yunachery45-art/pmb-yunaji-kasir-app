(function(){
  if(window.__pmbLoginFixInstalled)return;
  window.__pmbLoginFixInstalled=true;

  const wait=ms=>new Promise(r=>setTimeout(r,ms));

  async function ensureKasirSession(){
    const current=(await db.auth.getSession()).data.session;
    if(current?.user?.is_anonymous)return current;
    if(current)await db.auth.signOut({scope:'local'});
    const auth=await db.auth.signInAnonymously();
    if(auth.error)throw auth.error;
    if(!auth.data?.session?.user?.is_anonymous)throw new Error('Sesi anonim kasir tidak berhasil dibuat.');
    return auth.data.session;
  }

  async function openCashier(staffId){
    const message=document.getElementById('loginMessage');
    const buttons=[...document.querySelectorAll('#staffChoices .choice-btn')];
    buttons.forEach(b=>b.disabled=true);
    if(message)message.textContent='Membuka sesi kasir...';
    try{
      await ensureKasirSession();
      await rpc('kasir_set_operator',{p_staff_id:staffId});
      await wait(50);
      const current=(await rpc('kasir_current_operator'))?.[0];
      if(!current)throw new Error('PJ berhasil dipilih tetapi sesi operator belum terbaca.');

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
      if(message)message.textContent='';
    }catch(e){
      console.error('Cashier login failed',e);
      if(message)message.textContent='Login gagal: '+(e?.message||e);
      document.getElementById('loginView')?.classList.remove('hidden');
      document.getElementById('appView')?.classList.add('hidden');
      try{await db.auth.signOut({scope:'local'})}catch{}
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
      openCashier(id);
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();

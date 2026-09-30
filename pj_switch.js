(function(){
  const SUPABASE_URL='https://kjmotqzbifxsnscvtysz.supabase.co';
  const SUPABASE_KEY='sb_publishable_2LKsNXHeEemj9wnxr71eyw_ASH4ZFLK';
  const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{storageKey:'pmb_yunaji_kasir_session',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  async function rpc(name,args={}){const r=await db.rpc(name,args);if(r.error)throw r.error;return r.data}

  async function switchPj(){
    if(!confirm('Ganti PJ/Staff sekarang?\n\nKas harian tidak ditutup dan tetap satu untuk tanggal ini.'))return;
    const app=document.getElementById('appView');
    const login=document.getElementById('loginView');
    if(!app||!login)return;
    app.classList.add('hidden');
    login.classList.remove('hidden');
    const msg=document.getElementById('loginMessage');
    if(msg)msg.textContent='Pilih PJ/Staff berikutnya...';
    if(typeof window.renderStaffChoices==='function') await window.renderStaffChoices();
    bindChoices();
  }

  async function selectPj(id){
    const msg=document.getElementById('loginMessage');
    try{
      if(msg)msg.textContent='Mengganti PJ...';
      const session=(await db.auth.getSession()).data.session;
      if(!session?.user?.is_anonymous)throw new Error('Sesi kasir tidak aktif. Silakan masuk ulang.');
      await rpc('kasir_set_operator',{p_staff_id:Number(id)});
      const cash=(await rpc('kasir_status_kas_kasir'))?.[0];
      if(cash?.status==='OPEN') await rpc('kasir_ambil_alih_pj',{p_staff_id:Number(id)});
      if(typeof window.enterKasir==='function') await window.enterKasir();
      else location.reload();
    }catch(e){
      if(msg)msg.textContent='Gagal mengganti PJ: '+(e.message||e);
    }
  }

  function bindChoices(){
    document.querySelectorAll('#staffChoices .choice-btn').forEach(b=>{
      if(b.dataset.pjChoiceBound)return;
      const id=Number(b.dataset.id);if(!id)return;
      b.dataset.pjChoiceBound='1';
      b.onclick=()=>selectPj(id);
    });
  }

  function bind(){
    const b=document.getElementById('switchPjBtn');
    if(b&&!b.dataset.pjSwitchBound){b.dataset.pjSwitchBound='1';b.onclick=switchPj;}
    const side=document.querySelector('.logout-side');
    if(side&&!side.dataset.pjSwitchBound){side.dataset.pjSwitchBound='1';side.onclick=switchPj;}
    bindChoices();
  }

  window.addEventListener('DOMContentLoaded',()=>{
    bind();setTimeout(bind,250);setTimeout(bind,800);setTimeout(bind,1500);
  });
})();

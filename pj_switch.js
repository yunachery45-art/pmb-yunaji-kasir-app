(function(){
  const SUPABASE_URL='https://kjmotqzbifxsnscvtysz.supabase.co';
  const SUPABASE_KEY='sb_publishable_2LKsNXHeEemj9wnxr71eyw_ASH4ZFLK';
  const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{storageKey:'pmb_yunaji_kasir_session',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  async function rpc(name,args={}){const r=await db.rpc(name,args);if(r.error)throw r.error;return r.data}
  async function switchPj(){
    if(!confirm('Ganti PJ/Staff sekarang?\n\nKas harian tidak ditutup dan tetap satu untuk tanggal ini. Setelah keluar, pilih PJ/Staff berikutnya.'))return;
    await db.auth.signOut({scope:'local'});
    location.href='index.html';
  }
  async function selectPj(id){
    const msg=document.getElementById('loginMessage');
    try{
      if(msg)msg.textContent='Membuka sesi kasir...';
      const old=(await db.auth.getSession()).data.session;
      if(old)await db.auth.signOut({scope:'local'});
      const r=await db.auth.signInAnonymously();
      if(r.error)throw r.error;
      await rpc('kasir_set_operator',{p_staff_id:Number(id)});
      const cash=(await rpc('kasir_status_kas_kasir'))?.[0];
      if(cash?.status==='OPEN'){
        const active=(await rpc('kasir_pj_aktif'))?.[0];
        if(Number(active?.staff_id)!==Number(id))await rpc('kasir_ambil_alih_pj',{p_staff_id:Number(id)});
      }
      location.reload();
    }catch(e){if(msg)msg.textContent='Login gagal: '+e.message;await db.auth.signOut({scope:'local'});}
  }
  function bind(){
    const b=document.getElementById('switchPjBtn');
    if(b&&!b.dataset.pjSwitchBound){b.dataset.pjSwitchBound='1';b.onclick=switchPj;}
    document.querySelectorAll('#staffChoices .choice-btn').forEach(b=>{
      if(b.dataset.pjChoiceBound)return;
      const id=Number(b.dataset.id);if(!id)return;
      b.dataset.pjChoiceBound='1';
      b.onclick=()=>selectPj(id);
    });
  }
  document.addEventListener('DOMContentLoaded',()=>{bind();setTimeout(bind,250);setTimeout(bind,800);setTimeout(bind,1500);});
})();

(function(){
  const URL='https://kjmotqzbifxsnscvtysz.supabase.co';
  const KEY='sb_publishable_2LKsNXHeEemj9wnxr71eyw_ASH4ZFLK';
  const page=document.body.dataset.page;
  if(page!=='kasir') return;
  const db=window.supabase.createClient(URL,KEY,{auth:{storageKey:'pmb_yunaji_kasir_session',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const q=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  async function rpc(name,args={}){const r=await db.rpc(name,args);if(r.error)throw r.error;return r.data}
  function message(text){const el=q('cashMessage')||q('loginMessage');if(el)el.textContent=text||''}
  function closeModal(){q('finalPjModal')?.remove()}
  async function chooseStaff(id){
    message('Membuka sesi kasir...');
    try{
      let session=(await db.auth.getSession()).data.session;
      if(!session){const r=await db.auth.signInAnonymously();if(r.error)throw r.error;session=r.data.session}
      if(!session?.user)throw new Error('Sesi kasir tidak tersedia.');
      await rpc('kasir_set_operator',{p_staff_id:id});
      const cash=(await rpc('kasir_status_kas_kasir'))?.[0];
      if(cash?.status==='OPEN'){
        const active=(await rpc('kasir_pj_aktif'))?.[0];
        if(Number(active?.staff_id)!==Number(id)) await rpc('kasir_ambil_alih_pj',{p_staff_id:id});
      }
      if(typeof window.enterKasir==='function') await window.enterKasir(); else location.reload();
    }catch(e){message('Login/ganti PJ gagal: '+(e.message||e))}
  }
  async function openHandover(){
    try{
      const session=(await db.auth.getSession()).data.session;
      if(!session?.user){q('loginView')?.classList.remove('hidden');q('appView')?.classList.add('hidden');message('Sesi kasir tidak aktif. Silakan pilih PJ/Staff kembali.');return}
      const staff=await rpc('kasir_get_penanggung_jawab');
      const current=(await rpc('kasir_current_operator'))?.[0];
      if(!staff?.length)throw new Error('Belum ada PJ/Staff aktif.');
      const wrap=document.createElement('div');wrap.id='finalPjModal';wrap.className='handover-modal';
      wrap.innerHTML='<div class="handover-dialog"><h3>Ganti PJ / Staff</h3><p>Pilih PJ/Staff yang sekarang memegang kas. Kas hari ini tetap satu dan tidak dibuka ulang.</p><select id="finalPjSelect">'+staff.map(x=>'<option value="'+x.id+'" '+(Number(x.id)===Number(current?.staff_id)?'selected':'')+'>'+esc(x.nama)+'</option>').join('')+'</select><div class="dialog-actions"><button id="finalPjCancel" class="secondary">Batal</button><button id="finalPjConfirm" class="cash-gate-btn">Konfirmasi</button></div><p id="finalPjMsg" class="message"></p></div>';
      document.body.appendChild(wrap);
      q('finalPjCancel').onclick=closeModal;
      q('finalPjConfirm').onclick=async()=>{try{q('finalPjMsg').textContent='Mengganti PJ...';await chooseStaff(Number(q('finalPjSelect').value));closeModal()}catch(e){q('finalPjMsg').textContent=e.message||String(e)}};
    }catch(e){message(e.message||String(e))}
  }
  function bind(){
    const b=q('switchPjBtn');
    if(b){b.dataset.finalSwitchBound='1';b.onclick=openHandover}
    const side=document.querySelector('.logout-side');
    if(side){side.dataset.finalSwitchBound='1';side.removeAttribute('onclick');side.onclick=openHandover}
    document.querySelectorAll('#staffChoices .choice-btn').forEach(b=>{
      if(!b.dataset.finalLoginBound){b.dataset.finalLoginBound='1';b.dataset.handoverBound='1';b.onclick=()=>chooseStaff(Number(b.dataset.id))}
    });
  }
  function ensureHandoverAfterCashGuard(){
    if(typeof window.renderPjHandover!=='function') return;
    const badge=(q('cashBadge')?.textContent||'').trim().toUpperCase();
    if(badge==='TERBUKA') window.renderPjHandover();
  }
  document.addEventListener('DOMContentLoaded',()=>{
    [50,250,500,1000,1800,3000].forEach(ms=>setTimeout(()=>{bind();ensureHandoverAfterCashGuard()},ms));
  });
})();

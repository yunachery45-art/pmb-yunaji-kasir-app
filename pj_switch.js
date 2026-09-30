(function(){
  const SUPABASE_URL='https://kjmotqzbifxsnscvtysz.supabase.co';
  const SUPABASE_KEY='sb_publishable_2LKsNXHeEemj9wnxr71eyw_ASH4ZFLK';
  const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{storageKey:'pmb_yunaji_kasir_session',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  async function rpc(name,args={}){const r=await db.rpc(name,args);if(r.error)throw r.error;return r.data}

  function closeSwitchModal(){document.getElementById('pjSwitchModal')?.remove()}

  async function switchPj(){
    try{
      const session=(await db.auth.getSession()).data.session;
      if(!session?.user){
        document.getElementById('loginView')?.classList.remove('hidden');
        document.getElementById('appView')?.classList.add('hidden');
        if(typeof window.renderStaffChoices==='function')await window.renderStaffChoices();
        return;
      }

      const staff=await rpc('kasir_get_penanggung_jawab');
      if(!staff?.length)throw new Error('Belum ada PJ/Staff aktif.');
      const current=(await rpc('kasir_current_operator'))?.[0];
      const wrap=document.createElement('div');
      wrap.id='pjSwitchModal';
      wrap.className='handover-modal';
      wrap.innerHTML=`<div class="handover-dialog">
        <h3>Ganti PJ / Staff</h3>
        <p>Pilih orang yang sekarang memegang kas. Kas hari ini tetap satu dan tidak dibuka ulang.</p>
        <select id="pjSwitchSelect">${staff.map(x=>`<option value="${x.id}" ${Number(x.id)===Number(current?.staff_id)?'selected':''}>${String(x.nama||'')}</option>`).join('')}</select>
        <div class="dialog-actions">
          <button id="pjSwitchCancel" class="secondary">Batal</button>
          <button id="pjSwitchConfirm" class="cash-gate-btn">Konfirmasi</button>
        </div>
        <p id="pjSwitchMessage" class="message"></p>
      </div>`;
      document.body.appendChild(wrap);
      document.getElementById('pjSwitchCancel').onclick=closeSwitchModal;
      document.getElementById('pjSwitchConfirm').onclick=async()=>{
        const id=Number(document.getElementById('pjSwitchSelect').value);
        const m=document.getElementById('pjSwitchMessage');
        try{
          if(!id)return;
          m.textContent='Mengganti PJ...';
          await rpc('kasir_set_operator',{p_staff_id:id});
          const cash=(await rpc('kasir_status_kas_kasir'))?.[0];
          if(cash?.status==='OPEN')await rpc('kasir_ambil_alih_pj',{p_staff_id:id});
          closeSwitchModal();
          if(typeof window.enterKasir==='function')await window.enterKasir();
          else location.reload();
        }catch(e){m.textContent='Gagal mengganti PJ: '+(e.message||e)}
      };
    }catch(e){
      const msg=document.getElementById('cashMessage')||document.getElementById('loginMessage');
      if(msg)msg.textContent=e.message||String(e);
    }
  }

  function bindSwitch(){
    const b=document.getElementById('switchPjBtn');
    if(b&&!b.dataset.pjSwitchBound){b.dataset.pjSwitchBound='1';b.onclick=switchPj}
    const side=document.querySelector('.logout-side');
    if(side&&!side.dataset.pjSwitchBound){side.dataset.pjSwitchBound='1';side.onclick=switchPj;side.removeAttribute('onclick')}
  }

  function loadBootFix(){
    if(document.getElementById('pmbBootFix'))return;
    const s=document.createElement('script');
    s.id='pmbBootFix';
    s.src='boot_fix.js?v=20261001-2';
    s.async=false;
    document.head.appendChild(s);
  }

  window.addEventListener('DOMContentLoaded',()=>{loadBootFix();bindSwitch();setTimeout(bindSwitch,300);setTimeout(bindSwitch,1000);setTimeout(bindSwitch,2000)});
})();

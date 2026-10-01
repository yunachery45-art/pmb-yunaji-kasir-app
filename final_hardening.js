(function(){
  const URL='https://kjmotqzbifxsnscvtysz.supabase.co';
  const KEY='sb_publishable_2LKsNXHeEemj9wnxr71eyw_ASH4ZFLK';
  const page=document.body.dataset.page;
  if(page!=='kasir') return;
  const db=window.supabase.createClient(URL,KEY,{auth:{storageKey:'pmb_yunaji_kasir_session',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const adminDb=window.supabase.createClient(URL,KEY,{auth:{storageKey:'pmb_yunaji_admin_session',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const q=id=>document.getElementById(id);
  async function rpc(name,args={}){const r=await db.rpc(name,args);if(r.error)throw r.error;return r.data}
  async function adminRpc(name,args={}){const r=await adminDb.rpc(name,args);if(r.error)throw r.error;return r.data}
  function message(text){const el=q('cashMessage')||q('loginMessage');if(el)el.textContent=text||''}
  function closeModal(){q('finalPjModal')?.remove();q('singleAdminModal')?.remove()}
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
      wrap.innerHTML='<div class="handover-dialog"><h3>Ganti PJ / Staff</h3><p>Pilih PJ/Staff yang sekarang memegang kas. Kas hari ini tetap satu dan tidak dibuka ulang.</p><select id="finalPjSelect">'+staff.map(x=>'<option value="'+x.id+'" '+(Number(x.id)===Number(current?.staff_id)?'selected':'')+'>'+String(x.nama||'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'</option>').join('')+'</select><div class="dialog-actions"><button id="finalPjCancel" class="secondary">Batal</button><button id="finalPjConfirm" class="cash-gate-btn">Konfirmasi</button></div><p id="finalPjMsg" class="message"></p></div>';
      document.body.appendChild(wrap);
      q('finalPjCancel').onclick=closeModal;
      q('finalPjConfirm').onclick=async()=>{try{q('finalPjMsg').textContent='Mengganti PJ...';await chooseStaff(Number(q('finalPjSelect').value));closeModal()}catch(e){q('finalPjMsg').textContent=e.message||String(e)}};
    }catch(e){message(e.message||String(e))}
  }
  function removeAdminEntry(){
    document.querySelectorAll('a[href="admin.html"],a[href$="/admin.html"],#adminSideLink').forEach(el=>el.remove());
    document.querySelectorAll('.side-nav a').forEach(el=>{
      const text=(el.textContent||'').trim().toLowerCase();
      if(text==='admin' || text.includes('admin')) el.remove();
    });
  }
  function installSingleEntry(){
    if(!q('loginView')||q('singleAdminEntry')) return;
    const host=q('loginView').querySelector('.login-card');
    if(!host) return;
    const row=document.createElement('div');row.id='singleAdminEntry';row.style='margin-top:14px;padding-top:14px;border-top:1px solid #eadff4;text-align:center';
    row.innerHTML='<button type="button" id="singleAdminBtn" class="secondary" style="width:100%">🔐 Masuk sebagai Admin</button><p class="tiny-note" style="margin-top:7px">Admin menggunakan kata sandi. Kata sandi tidak disimpan di perangkat.</p>';
    host.appendChild(row);
    q('singleAdminBtn').onclick=openAdminLogin;
  }
  function openAdminLogin(){
    if(q('singleAdminModal')) return;
    const saved=localStorage.getItem('pmb_yunaji_admin_email')||'';
    const wrap=document.createElement('div');wrap.id='singleAdminModal';wrap.className='handover-modal';
    wrap.innerHTML='<div class="handover-dialog"><h3>Login Admin</h3><p>Masukkan kata sandi Admin. Kata sandi tidak disimpan.</p>'+(saved?'':'<label>Email Admin<input id="singleAdminEmail" type="email" autocomplete="username" placeholder="Email Admin"></label>')+'<label>Kata Sandi<input id="singleAdminPassword" type="password" autocomplete="current-password" placeholder="Kata sandi Admin"></label><div class="dialog-actions"><button id="singleAdminCancel" class="secondary">Batal</button><button id="singleAdminConfirm" class="cash-gate-btn">Masuk Admin</button></div><p id="singleAdminMsg" class="message"></p></div>';
    document.body.appendChild(wrap);
    q('singleAdminCancel').onclick=()=>wrap.remove();
    q('singleAdminConfirm').onclick=async()=>{
      const email=saved||q('singleAdminEmail')?.value.trim();
      const password=q('singleAdminPassword')?.value||'';
      if(!email||!password){q('singleAdminMsg').textContent='Email dan kata sandi wajib diisi.';return}
      q('singleAdminConfirm').disabled=true;q('singleAdminMsg').textContent='Memeriksa...';
      try{
        await db.auth.signOut({scope:'local'});
        await adminDb.auth.signOut({scope:'local'});
        const r=await adminDb.auth.signInWithPassword({email,password});
        if(r.error)throw r.error;
        const role=(await adminRpc('kasir_current_role').catch(()=>null));
        if(!['admin','owner'].includes(String(role||'').toLowerCase())){await adminDb.auth.signOut({scope:'local'});throw new Error('Akun ini bukan Admin/Owner.')}
        localStorage.setItem('pmb_yunaji_admin_email',email);
        sessionStorage.setItem('pmb_yunaji_admin_entry','1');
        location.href='admin.html';
      }catch(e){q('singleAdminMsg').textContent='Login Admin gagal: '+(e.message||e);q('singleAdminConfirm').disabled=false}
    };
    setTimeout(()=>q('singleAdminPassword')?.focus(),50);
  }
  function bind(){
    removeAdminEntry();
    installSingleEntry();
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
  const observer=new MutationObserver(()=>{removeAdminEntry();installSingleEntry()});
  document.addEventListener('DOMContentLoaded',()=>{
    observer.observe(document.body,{childList:true,subtree:true});
    [50,250,500,1000,1800,3000].forEach(ms=>setTimeout(()=>{bind();ensureHandoverAfterCashGuard()},ms));
  });
})();

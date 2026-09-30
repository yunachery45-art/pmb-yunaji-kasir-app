(function(){
  const q=id=>document.getElementById(id);
  const msg=(id,t)=>{if(q(id))q(id).textContent=t||''};
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const SUPABASE_URL='https://kjmotqzbifxsnscvtysz.supabase.co';
  const SUPABASE_KEY='sb_publishable_2LKsNXHeEemj9wnxr71eyw_ASH4ZFLK';
  const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{storageKey:document.body.dataset.page==='admin'?'pmb_yunaji_admin_session':'pmb_yunaji_kasir_session',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  async function rpc(name,args={}){const r=await client.rpc(name,args);if(r.error)throw r.error;return r.data}
  async function getSettings(){try{const rows=await rpc('kasir_get_pengaturan');return Object.fromEntries((rows||[]).map(x=>[x.kode,x.nilai||'']));}catch(e){return {}}}
  function applyBrand(s){
    const name=s.NAMA_PMB||s.brand_name||'PMB Bidan Yunaji Sri Rejeki';
    const tagline=s.tagline||'Melayani dengan Hati untuk Mom & Baby';
    document.title=(document.body.dataset.page==='admin'?'Admin ':'Kasir ') + name;
    document.querySelectorAll('.brand strong').forEach(el=>el.innerHTML=esc(name));
    document.querySelectorAll('.brand small').forEach(el=>el.innerHTML='“'+esc(tagline)+'”');
    document.querySelectorAll('.eyebrow').forEach(el=>{if(/PMB BIDAN YUNAJI SRI REJEKI/i.test(el.textContent||'')) el.textContent=name.toUpperCase();});
    document.querySelectorAll('.login-card .eyebrow').forEach(el=>el.textContent=name.toUpperCase());
    document.querySelectorAll('.brand-logo,.brand-mark').forEach(el=>{
      if(s.logo_url){el.innerHTML='<img class="dynamic-brand-logo" src="'+esc(s.logo_url)+'" alt="Logo">';}
    });
    let style=document.getElementById('dynamicBrandStyle');
    if(!style){style=document.createElement('style');style.id='dynamicBrandStyle';style.textContent='.dynamic-brand-logo{width:100%;height:100%;object-fit:contain;border-radius:14px}.brand-logo:has(.dynamic-brand-logo){background:transparent}.brand-mark:has(.dynamic-brand-logo){background:transparent}#dynamicSettingsCard hr{margin:24px 0;border:0;border-top:1px solid #eee}';document.head.appendChild(style)}
  }
  async function refreshStaffLogin(){
    const box=q('staffChoices'); if(!box)return;
    try{const staff=await rpc('kasir_get_penanggung_jawab');box.innerHTML=(staff||[]).map(x=>`<button class="choice-btn" data-id="${x.id}">${esc(x.nama)}</button>`).join('')||'<p class="muted">Belum ada PJ aktif.</p>';document.querySelectorAll('.choice-btn').forEach(b=>b.onclick=async()=>{try{const old=(await client.auth.getSession()).data.session;if(old)await client.auth.signOut({scope:'local'});const r=await client.auth.signInAnonymously();if(r.error)throw r.error;await rpc('kasir_set_operator',{p_staff_id:Number(b.dataset.id)});location.reload()}catch(e){msg('loginMessage','Login gagal: '+e.message)}});}catch(e){msg('loginMessage',e.message)}
  }
  async function setupAdminSettings(){
    if(document.body.dataset.page!=='admin' || !q('settingsPanel'))return;
    const host=q('settingsPanel'); if(q('dynamicSettingsCard'))return;
    const card=document.createElement('div');card.className='card';card.id='dynamicSettingsCard';card.innerHTML=`<div class="card-head"><p class="eyebrow">PENGATURAN SISTEM</p><h2>Identitas & PJ Kasir</h2><p class="muted">Admin dapat mengganti identitas tampilan aplikasi dan mengatur daftar PJ. PJ lama sebaiknya dinonaktifkan, bukan dihapus, agar riwayat tetap aman.</p></div><div class="form-grid"><label>Nama PMB<input id="setBrandName"></label><label>Tagline / Tulisan bawah logo<input id="setTagline"></label><label>URL Logo<input id="setLogoUrl" placeholder="https://..."></label><div class="full"><button id="saveBrandSettings">Simpan Identitas</button><p id="brandSettingsMsg" class="message"></p></div></div><hr><div class="card-head"><p class="eyebrow">DATA PJ / STAFF</p><h2>Kelola PJ Kasir</h2></div><form id="staffForm" class="form-grid"><input type="hidden" id="staffId"><label>Nama PJ<input id="staffName" required></label><label>Jabatan<input id="staffRole" value="Bidan"></label><label>Urutan<input id="staffOrder" type="number" value="0"></label><label>Status<select id="staffActive"><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label><div class="full"><button type="submit">Simpan PJ</button><button type="button" class="secondary" id="staffReset">PJ Baru</button><p id="staffMsg" class="message"></p></div></form><div class="table-wrap"><table><thead><tr><th>Nama</th><th>Jabatan</th><th>Status</th><th>Urutan</th><th>Aksi</th></tr></thead><tbody id="staffRows"></tbody></table></div>`;
    host.appendChild(card);
    const load=async()=>{try{const rows=await rpc('kasir_admin_get_staff');q('staffRows').innerHTML=(rows||[]).map(x=>`<tr><td>${esc(x.nama)}</td><td>${esc(x.jabatan)}</td><td>${x.aktif?'Aktif':'Nonaktif'}</td><td>${x.urutan}</td><td><button class="secondary staff-edit" data-id="${x.id}">Edit</button></td></tr>`).join('')||'<tr><td colspan="5">Belum ada PJ.</td></tr>';document.querySelectorAll('.staff-edit').forEach(b=>b.onclick=()=>{const x=(rows||[]).find(r=>String(r.id)===b.dataset.id);if(!x)return;q('staffId').value=x.id;q('staffName').value=x.nama;q('staffRole').value=x.jabatan;q('staffOrder').value=x.urutan;q('staffActive').value=String(x.aktif);});}catch(e){msg('staffMsg',e.message)}};
    const s=await getSettings();q('setBrandName').value=s.NAMA_PMB||s.brand_name||'';q('setTagline').value=s.tagline||'';q('setLogoUrl').value=s.logo_url||'';
    q('saveBrandSettings').onclick=async()=>{try{await rpc('kasir_admin_update_pengaturan',{p_kode:'NAMA_PMB',p_nilai:q('setBrandName').value.trim()});await rpc('kasir_admin_update_pengaturan',{p_kode:'tagline',p_nilai:q('setTagline').value.trim()});await rpc('kasir_admin_update_pengaturan',{p_kode:'logo_url',p_nilai:q('setLogoUrl').value.trim()});msg('brandSettingsMsg','Identitas berhasil disimpan. Refresh laman untuk melihat perubahan.');}catch(e){msg('brandSettingsMsg',e.message)}};
    q('staffForm').onsubmit=async e=>{e.preventDefault();try{await rpc('kasir_admin_upsert_staff',{p_id:q('staffId').value?Number(q('staffId').value):null,p_nama:q('staffName').value.trim(),p_jabatan:q('staffRole').value.trim()||'Bidan',p_aktif:q('staffActive').value==='true',p_urutan:Number(q('staffOrder').value||0)});msg('staffMsg','PJ berhasil disimpan.');q('staffForm').reset();q('staffRole').value='Bidan';q('staffActive').value='true';q('staffId').value='';await load();}catch(e){msg('staffMsg',e.message)}};
    q('staffReset').onclick=()=>{q('staffForm').reset();q('staffRole').value='Bidan';q('staffActive').value='true';q('staffId').value='';};
    await load();
  }
  document.addEventListener('DOMContentLoaded',async()=>{const s=await getSettings();applyBrand(s);await refreshStaffLogin();setTimeout(setupAdminSettings,150);});
})();

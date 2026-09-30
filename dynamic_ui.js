(function(){
  const q=id=>document.getElementById(id);
  const msg=(id,t)=>{if(q(id))q(id).textContent=t||''};
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const initials=n=>String(n||'PJ').split(/\s+/).filter(Boolean).slice(-2).map(x=>x[0]).join('').toUpperCase();
  const SUPABASE_URL='https://kjmotqzbifxsnscvtysz.supabase.co';
  const SUPABASE_KEY='sb_publishable_2LKsNXHeEemj9wnxr71eyw_ASH4ZFLK';
  const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{storageKey:document.body.dataset.page==='admin'?'pmb_yunaji_admin_session':'pmb_yunaji_kasir_session',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  async function rpc(name,args={}){const r=await client.rpc(name,args);if(r.error)throw r.error;return r.data}
  async function getSettings(){try{const rows=await rpc('kasir_get_pengaturan');return Object.fromEntries((rows||[]).map(x=>[x.kode,x.nilai||'']));}catch(e){return {}}}
  function safeColor(v,fallback){return /^#[0-9a-fA-F]{6}$/.test(String(v||''))?v:fallback}
  function applyBrand(s){
    const name=s.brand_name||s.NAMA_PMB||'PMB Bidan Yunaji Sri Rejeki';
    const tagline=s.tagline||'Melayani dengan Hati untuk Mom & Baby';
    const primary=safeColor(s.primary_color,'#6f25d9');
    const secondary=safeColor(s.secondary_color,'#a12cf0');
    const accent=safeColor(s.accent_color,'#ec2d9a');
    const bg=safeColor(s.background_color,'#f5f2fb');
    document.title=(document.body.dataset.page==='admin'?'Admin ':'Kasir ')+name;
    document.documentElement.style.setProperty('--purple',primary);
    document.documentElement.style.setProperty('--purple2',secondary);
    document.documentElement.style.setProperty('--pink',accent);
    document.documentElement.style.setProperty('--bg',bg);
    document.documentElement.style.setProperty('--dynamic-primary',primary);
    document.documentElement.style.setProperty('--dynamic-secondary',secondary);
    document.documentElement.style.setProperty('--dynamic-accent',accent);
    document.querySelectorAll('.brand strong').forEach(el=>el.innerHTML=esc(name).replace(/\s+/g,'<br>'));
    document.querySelectorAll('.brand small').forEach(el=>el.textContent='“'+tagline+'”');
    document.querySelectorAll('.login-card .eyebrow').forEach(el=>el.textContent=name.toUpperCase());
    const title=q('loginTitle');if(title)title.textContent=s.login_title||'Kasir Klinik';
    const subtitle=q('loginSubtitle');if(subtitle)subtitle.textContent=s.login_subtitle||'Pilih nama PJ untuk masuk. Tidak perlu password.';
    document.querySelectorAll('.brand-logo,.brand-mark').forEach(el=>{if(s.logo_url){el.innerHTML='<img class="dynamic-brand-logo" src="'+esc(s.logo_url)+'" alt="Logo">';}});
    let style=q('dynamicBrandStyle');
    if(!style){style=document.createElement('style');style.id='dynamicBrandStyle';style.textContent=`
      :root{--dynamic-primary:#6f25d9;--dynamic-secondary:#a12cf0;--dynamic-accent:#ec2d9a}
      .dynamic-brand-logo{width:100%;height:100%;object-fit:contain;border-radius:14px}.brand-logo:has(.dynamic-brand-logo),.brand-mark:has(.dynamic-brand-logo){background:transparent}
      .staff-avatar{width:38px;height:38px;display:grid;place-items:center;border-radius:50%;background:linear-gradient(135deg,var(--dynamic-accent),var(--dynamic-secondary));color:#fff;font-size:11px;font-weight:900;flex:0 0 38px}
      .choice-btn{display:flex!important;align-items:center;justify-content:flex-start;gap:11px;text-align:left!important}.choice-btn .staff-text{display:flex;flex-direction:column}.choice-btn .staff-role{font-size:10px;font-weight:600;opacity:.72;margin-top:2px}
      .admin-kpi-grid .stat{padding:14px;border-radius:12px;background:#fff;border:1px solid #eadff4;box-shadow:0 4px 16px rgba(62,30,91,.05)}.admin-kpi-grid .stat strong{font-size:20px;color:#17164b}
      #dynamicSettingsCard{margin-top:14px}#dynamicSettingsCard hr{margin:24px 0;border:0;border-top:1px solid #eadff4}
      .settings-color{height:44px;padding:4px!important}.settings-preview{border-radius:14px;padding:16px;color:#fff;background:linear-gradient(135deg,var(--dynamic-primary),var(--dynamic-secondary));margin-top:12px;font-weight:800}
      .dashboard-layout .card{overflow:hidden}.dashboard-layout .bar-chart{display:flex;align-items:flex-end;justify-content:space-around;gap:18px}.dashboard-layout .bar-col{height:190px;display:flex;align-items:flex-end;gap:4px;position:relative;min-width:55px}.dashboard-layout .bar{display:block;width:18px;border-radius:8px 8px 2px 2px}.dashboard-layout .bar.pink{background:linear-gradient(180deg,var(--dynamic-accent),#d82388)!important}.dashboard-layout .bar-label{position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);font-size:10px;font-weight:800}
    `;document.head.appendChild(style)}
  }
  async function refreshStaffLogin(){
    const box=q('staffChoices');if(!box)return;
    try{const staff=await rpc('kasir_get_penanggung_jawab');box.innerHTML=(staff||[]).map(x=>`<button class="choice-btn" data-id="${x.id}"><span class="staff-avatar">${initials(x.nama)}</span><span class="staff-text"><span>${esc(x.nama)}</span><span class="staff-role">${esc(x.jabatan||'PJ Kasir')}</span></span></button>`).join('')||'<p class="muted">Belum ada PJ aktif.</p>';document.querySelectorAll('.choice-btn').forEach(b=>b.onclick=async()=>{try{const old=(await client.auth.getSession()).data.session;if(old)await client.auth.signOut({scope:'local'});const r=await client.auth.signInAnonymously();if(r.error)throw r.error;await rpc('kasir_set_operator',{p_staff_id:Number(b.dataset.id)});location.reload()}catch(e){msg('loginMessage','Login gagal: '+e.message)}});}catch(e){msg('loginMessage','Daftar PJ belum dapat dimuat: '+e.message)}
  }
  async function setupAdminSettings(){
    if(document.body.dataset.page!=='admin'||!q('settingsPanel'))return;
    const host=q('settingsPanel');if(q('dynamicSettingsCard'))return;
    const card=document.createElement('div');card.className='card';card.id='dynamicSettingsCard';card.innerHTML=`<div class="card-head"><p class="eyebrow">PENGATURAN SISTEM</p><h2>Identitas, Tampilan & PJ Kasir</h2><p class="muted">Semua perubahan di sini menjadi sumber tampilan aplikasi. PJ lama sebaiknya dinonaktifkan, bukan dihapus, agar riwayat transaksi tetap aman.</p></div><div class="form-grid"><label>Nama PMB<input id="setBrandName"></label><label>Judul Laman Awal<input id="setLoginTitle"></label><label>Tagline / Tulisan bawah logo<input id="setTagline"></label><label>Teks penjelasan laman awal<input id="setLoginSubtitle"></label><label>URL Logo<input id="setLogoUrl" placeholder="https://..."></label><label>Warna Utama<input id="setPrimaryColor" class="settings-color" type="color"></label><label>Warna Sekunder<input id="setSecondaryColor" class="settings-color" type="color"></label><label>Warna Aksen<input id="setAccentColor" class="settings-color" type="color"></label><label>Warna Latar<input id="setBackgroundColor" class="settings-color" type="color"></label><div class="full"><div class="settings-preview">Pratinjau warna aplikasi — ${esc(nameFallback())}</div></div><div class="full"><button id="saveBrandSettings">Simpan Pengaturan Tampilan</button><p id="brandSettingsMsg" class="message"></p></div></div><hr><div class="card-head"><p class="eyebrow">DATA PJ / STAFF</p><h2>Kelola PJ Kasir</h2></div><form id="staffForm" class="form-grid"><input type="hidden" id="staffId"><label>Nama PJ<input id="staffName" required></label><label>Jabatan<input id="staffRole" value="Bidan"></label><label>Urutan<input id="staffOrder" type="number" value="0"></label><label>Status<select id="staffActive"><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label><div class="full"><button type="submit">Simpan PJ</button><button type="button" class="secondary" id="staffReset">PJ Baru</button><p id="staffMsg" class="message"></p></div></form><div class="table-wrap"><table><thead><tr><th>Nama</th><th>Jabatan</th><th>Status</th><th>Urutan</th><th>Aksi</th></tr></thead><tbody id="staffRows"></tbody></table></div>`;
    host.appendChild(card);
    function nameFallback(){return 'PMB Bidan Yunaji Sri Rejeki'}
    const load=async()=>{try{const rows=await rpc('kasir_admin_get_staff');q('staffRows').innerHTML=(rows||[]).map(x=>`<tr><td>${esc(x.nama)}</td><td>${esc(x.jabatan)}</td><td>${x.aktif?'Aktif':'Nonaktif'}</td><td>${x.urutan}</td><td><button class="secondary staff-edit" data-id="${x.id}">Edit</button></td></tr>`).join('')||'<tr><td colspan="5">Belum ada PJ.</td></tr>';document.querySelectorAll('.staff-edit').forEach(b=>b.onclick=()=>{const x=(rows||[]).find(r=>String(r.id)===b.dataset.id);if(!x)return;q('staffId').value=x.id;q('staffName').value=x.nama;q('staffRole').value=x.jabatan;q('staffOrder').value=x.urutan;q('staffActive').value=String(x.aktif);});}catch(e){msg('staffMsg',e.message)}};
    const s=await getSettings();q('setBrandName').value=s.brand_name||s.NAMA_PMB||'';q('setTagline').value=s.tagline||'';q('setLogoUrl').value=s.logo_url||'';q('setLoginTitle').value=s.login_title||'Kasir Klinik';q('setLoginSubtitle').value=s.login_subtitle||'Pilih nama PJ untuk masuk. Tidak perlu password.';q('setPrimaryColor').value=safeColor(s.primary_color,'#6f25d9');q('setSecondaryColor').value=safeColor(s.secondary_color,'#a12cf0');q('setAccentColor').value=safeColor(s.accent_color,'#ec2d9a');q('setBackgroundColor').value=safeColor(s.background_color,'#f5f2fb');
    q('saveBrandSettings').onclick=async()=>{try{const values={brand_name:q('setBrandName').value.trim(),NAMA_PMB:q('setBrandName').value.trim(),tagline:q('setTagline').value.trim(),logo_url:q('setLogoUrl').value.trim(),login_title:q('setLoginTitle').value.trim(),login_subtitle:q('setLoginSubtitle').value.trim(),primary_color:q('setPrimaryColor').value,secondary_color:q('setSecondaryColor').value,accent_color:q('setAccentColor').value,background_color:q('setBackgroundColor').value};for(const [k,v] of Object.entries(values))await rpc('kasir_admin_update_pengaturan',{p_kode:k,p_nilai:v});msg('brandSettingsMsg','Pengaturan berhasil disimpan.');applyBrand(values);}catch(e){msg('brandSettingsMsg',e.message)}};
    q('staffForm').onsubmit=async e=>{e.preventDefault();try{await rpc('kasir_admin_upsert_staff',{p_id:q('staffId').value?Number(q('staffId').value):null,p_nama:q('staffName').value.trim(),p_jabatan:q('staffRole').value.trim()||'Bidan',p_aktif:q('staffActive').value==='true',p_urutan:Number(q('staffOrder').value||0)});msg('staffMsg','PJ berhasil disimpan.');q('staffForm').reset();q('staffRole').value='Bidan';q('staffActive').value='true';q('staffId').value='';await load();}catch(e){msg('staffMsg',e.message)}};
    q('staffReset').onclick=()=>{q('staffForm').reset();q('staffRole').value='Bidan';q('staffActive').value='true';q('staffId').value='';};
    await load();
  }
  async function refreshAdminDashboard(){
    if(document.body.dataset.page!=='admin'||!q('dashboardPanel'))return;
    try{
      const d=(await rpc('kasir_admin_dashboard_ui',{p_mulai:q('reportFrom')?.value||new Date().toISOString().slice(0,10),p_selesai:q('reportTo')?.value||new Date().toISOString().slice(0,10)}))?.[0];
      if(d){q('dashboardStats').innerHTML=`<div class="stat"><span>Total Pasien</span><strong>${d.total_pasien}</strong></div><div class="stat"><span>Total Pelayanan</span><strong>${d.total_pelayanan}</strong></div><div class="stat"><span>Pelayanan Selesai</span><strong>${d.pelayanan_selesai}</strong></div><div class="stat"><span>Total Pemasukan</span><strong>${new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(d.total_pemasukan||0))}</strong></div><div class="stat"><span>Total Pengeluaran</span><strong>${new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(d.total_pengeluaran||0))}</strong></div><div class="stat"><span>Saldo Kas</span><strong>${new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(d.saldo_kas||0))}</strong></div>`;
        const bars=q('dashboardPanel')?.querySelectorAll('.bar-col');
        if(bars?.length){const r=await rpc('kasir_admin_rekap_pelaksana',{p_mulai:q('reportFrom').value,p_selesai:q('reportTo').value,p_pelaksana_id:null});const max=Math.max(1,...(r||[]).map(x=>Number(x.jumlah_pelayanan||0)));bars.forEach((b,i)=>{const row=(r||[])[i];const h=row?Math.max(12,Math.round(Number(row.jumlah_pelayanan||0)/max*82)):12;const label=b.querySelector('.bar-label');if(label)label.textContent=row?.pelaksana||'-';const bs=b.querySelectorAll('.bar');if(bs[0])bs[0].style.height=h+'%';if(bs[1])bs[1].style.height=Math.min(95,h+10)+'%';});}
      }
    }catch(e){msg('dashboardMessage',e.message)}
  }
  document.addEventListener('DOMContentLoaded',async()=>{const s=await getSettings();applyBrand(s);await refreshStaffLogin();setTimeout(setupAdminSettings,180);setTimeout(refreshAdminDashboard,400);});
})();
const SUPABASE_URL='https://kjmotqzbifxsnscvtysz.supabase.co';
const SUPABASE_KEY='sb_publishable_2LKsNXHeEemj9wnxr71eyw_ASH4ZFLK';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
const todayJakarta=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let categories=[],staff=[],payments=[];
let currentRole='staff';

async function loadOptions(){
  const [{data:c,error:ce},{data:s,error:se},{data:p,error:pe}]=await Promise.all([
    db.rpc('kasir_get_kategori',{p_jenis:$('type').value}),
    db.rpc('kasir_get_penanggung_jawab'),
    db.rpc('kasir_get_metode_pembayaran')
  ]);
  if(ce||se||pe)throw new Error('Gagal memuat master data');
  categories=c||[];staff=s||[];payments=p||[];
  $('category').innerHTML=categories.map(x=>`<option value="${x.id}">${x.nama}</option>`).join('');
  $('staff').innerHTML=staff.map(x=>`<option value="${x.id}">${x.nama}</option>`).join('');
  $('payment').innerHTML=payments.map(x=>`<option value="${x.id}">${x.nama||x.name}</option>`).join('');
}

async function loadRole(){
  const {data,error}=await db.rpc('kasir_current_role');
  if(!error&&data)currentRole=String(data).toLowerCase();
  const owner=['owner','admin'].includes(currentRole);
  $('roleBadge').textContent=owner?'Owner':'Staff';
  document.querySelectorAll('.owner-only').forEach(x=>x.classList.toggle('hidden',!owner));
  return owner;
}

async function loadDashboard(){
  const {data,error}=await db.rpc('kasir_dashboard_hari_ini');
  if(error){$('message').textContent='Gagal memuat dashboard: '+error.message;return}
  const d=Array.isArray(data)?data[0]:data;
  if(d){
    $('income').textContent=rupiah(d.total_pemasukan);
    $('expense').textContent=rupiah(d.total_pengeluaran);
    $('balance').textContent=rupiah(d.saldo_transaksi);
  }
  const h=await db.rpc('kasir_riwayat_hari_ini');
  if(h.error){$('message').textContent='Gagal memuat riwayat: '+h.error.message;return}
  const rows=h.data||[];
  $('transactionList').innerHTML=rows.map(x=>`<tr><td>${x.nomor_transaksi||x.transaction_no||'-'}</td><td>${x.catatan||x.note||'-'}</td><td>${rupiah(x.nominal||x.amount)}</td><td>${x.status||'Selesai'}</td></tr>`).join('');
  $('ownerCount').textContent=`${rows.length} transaksi hari ini`;
  await loadCashStatus();
}

async function loadCashStatus(){
  const {data,error}=await db.rpc('kasir_status_kas');
  if(error){$('cashStatus').textContent='Status kas gagal dimuat';return}
  const s=Array.isArray(data)?data[0]:data;
  if(!s){
    $('cashStatus').textContent='Belum dibuka';
    $('cashDetail').textContent='Belum ada sesi kas hari ini.';
    $('ownerBalance').textContent='Rp0';
    $('systemCash').textContent='Rp0';
    $('cashIn').textContent='Rp0';
    $('cashOut').textContent='Rp0';
    $('openCashBtn').classList.remove('hidden');
    $('openingCash').classList.remove('hidden');
    $('closeCashBtn').classList.add('hidden');
    $('closingCash').classList.add('hidden');
    $('closingNote').classList.add('hidden');
    return;
  }
  const systemCash=Number(s.kas_sistem||0);
  $('cashStatus').textContent=s.status==='OPEN'?'KAS TERBUKA':'KAS DITUTUP';
  $('cashDetail').textContent=`Kas awal ${rupiah(s.kas_awal)} • Kas sistem ${rupiah(systemCash)}`;
  $('ownerBalance').textContent=rupiah(systemCash);
  $('systemCash').textContent=rupiah(systemCash);
  $('cashIn').textContent=rupiah(s.kas_masuk);
  $('cashOut').textContent=rupiah(s.kas_keluar);
  const open=s.status==='OPEN';
  const owner=['owner','admin'].includes(currentRole);
  $('openCashBtn').classList.toggle('hidden',open||!owner);
  $('openingCash').classList.toggle('hidden',open||!owner);
  $('closeCashBtn').classList.toggle('hidden',!open||!owner);
  $('closingCash').classList.toggle('hidden',!open||!owner);
  $('closingNote').classList.toggle('hidden',!open||!owner);
}

async function loadReport(){
  const from=$('reportFrom').value,to=$('reportTo').value;
  if(!from||!to){$('reportMessage').textContent='Pilih tanggal mulai dan tanggal akhir.';return}
  if(from>to){$('reportMessage').textContent='Tanggal mulai tidak boleh setelah tanggal akhir.';return}
  $('reportMessage').textContent='Memuat laporan...';
  const {data,error}=await db.rpc('kasir_laporan_periode',{p_mulai:from,p_selesai:to});
  if(error){$('reportMessage').textContent='Gagal memuat laporan: '+error.message;return}
  const rows=Array.isArray(data)?data:(data?[data]:[]);
  if(!rows.length){
    $('reportIncome').textContent='Rp0';
    $('reportExpense').textContent='Rp0';
    $('reportBalance').textContent='Rp0';
    $('reportCount').textContent='0';
    $('reportMessage').textContent='Tidak ada data pada periode tersebut.';
    return;
  }
  const totalIncome=rows.reduce((sum,row)=>sum+Number(row.pemasukan||row.total_pemasukan||0),0);
  const totalExpense=rows.reduce((sum,row)=>sum+Number(row.pengeluaran||row.total_pengeluaran||0),0);
  const totalCount=rows.reduce((sum,row)=>sum+Number(row.jumlah_transaksi||0),0);
  const totalBalance=totalIncome-totalExpense;
  $('reportIncome').textContent=rupiah(totalIncome);
  $('reportExpense').textContent=rupiah(totalExpense);
  $('reportBalance').textContent=rupiah(totalBalance);
  $('reportCount').textContent=String(totalCount);
  $('reportMessage').textContent=`Laporan ${from} sampai ${to} berhasil dimuat.`;
}

async function showApp(session){
  $('loginView').classList.add('hidden');
  $('appView').classList.remove('hidden');
  $('userLabel').textContent=session.user.email||'';
  try{
    const owner=await loadRole();
    await loadOptions();
    if(owner){
      await loadDashboard();
      const today=todayJakarta();
      $('reportFrom').value=today;
      $('reportTo').value=today;
      await loadReport();
    }
  }catch(e){$('message').textContent=e.message}
}

$('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  $('loginMessage').textContent='Memproses...';
  const {data,error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
  if(error){$('loginMessage').textContent=error.message;return}
  await showApp(data.session);
});

$('logoutBtn').addEventListener('click',()=>db.auth.signOut());
$('type').addEventListener('change',loadOptions);
$('reportBtn').addEventListener('click',loadReport);

document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
  $(btn.dataset.view).classList.remove('hidden');
}));

$('transactionForm').addEventListener('submit',async e=>{
  e.preventDefault();
  $('message').textContent='Menyimpan...';
  const nominal=Number($('amount').value);
  if(!Number.isInteger(nominal)||nominal<1){$('message').textContent='Nominal harus berupa angka bulat minimal Rp1.';return}
  const {error}=await db.rpc('kasir_input_transaksi',{
    p_jenis:$('type').value,
    p_kategori_id:Number($('category').value),
    p_penanggung_jawab_id:Number($('staff').value),
    p_metode_pembayaran_id:Number($('payment').value),
    p_nominal:nominal,
    p_catatan:$('description').value.trim()+($('note').value.trim()?` — ${$('note').value.trim()}`:'')
  });
  if(error){$('message').textContent=error.message;return}
  $('message').textContent='Transaksi berhasil disimpan.';
  e.target.reset();
  await loadOptions();
  if(['owner','admin'].includes(currentRole)){
    await loadDashboard();
    await loadReport();
  }
  setTimeout(()=>$('message').textContent='',2500);
});

$('openCashBtn').addEventListener('click',async()=>{
  const amount=Number($('openingCash').value||0);
  if(!Number.isInteger(amount)||amount<0){$('cashMessage').textContent='Kas awal harus berupa angka bulat dan tidak boleh negatif.';return}
  $('cashMessage').textContent='Membuka kas...';
  const {error}=await db.rpc('kasir_buka_kas_sesi',{p_tanggal:todayJakarta(),p_kas_awal:amount,p_catatan:'Dibuka dari aplikasi Kasir PMB Yunaji'});
  if(error){$('cashMessage').textContent=error.message;return}
  $('cashMessage').textContent='Kas berhasil dibuka.';
  $('openingCash').value='';
  await loadDashboard();
});

$('closeCashBtn').addEventListener('click',async()=>{
  const amount=Number($('closingCash').value||0);
  const note=$('closingNote').value.trim();
  if(!Number.isInteger(amount)||amount<0){$('cashMessage').textContent='Kas fisik harus berupa angka bulat dan tidak boleh negatif.';return}
  const {data:statusData,error:statusError}=await db.rpc('kasir_status_kas');
  if(statusError){$('cashMessage').textContent='Gagal membaca status kas.';return}
  const s=Array.isArray(statusData)?statusData[0]:statusData;
  if(!s||s.status!=='OPEN'){$('cashMessage').textContent='Kas sudah ditutup atau belum dibuka.';await loadCashStatus();return}
  const expected=Number(s.kas_sistem||0);
  const difference=amount-expected;
  if(Math.abs(difference)>0.0001&&!note){$('cashMessage').textContent=`Ada selisih ${rupiah(difference)}. Isi catatan selisih terlebih dahulu.`;$('closingNote').focus();return}
  const confirmation=`Tutup kas dengan kas fisik ${rupiah(amount)}?\nKas sistem: ${rupiah(expected)}${Math.abs(difference)>0.0001?'\nSelisih: '+rupiah(difference):'\nSelisih: Rp0'}`;
  if(!confirm(confirmation))return;
  $('cashMessage').textContent='Menutup kas...';
  const {error}=await db.rpc('kasir_tutup_kas_sesi',{p_tanggal:todayJakarta(),p_kas_fisik:amount,p_catatan:note||'Ditutup dari aplikasi Kasir PMB Yunaji'});
  if(error){$('cashMessage').textContent=error.message;return}
  $('cashMessage').textContent='Kas berhasil ditutup.';
  $('closingCash').value='';
  $('closingNote').value='';
  await loadDashboard();
});

db.auth.onAuthStateChange((event,session)=>{
  if(session&&event!=='SIGNED_OUT')showApp(session);
  else if(event==='SIGNED_OUT'){
    $('appView').classList.add('hidden');
    $('loginView').classList.remove('hidden');
  }
});

(async()=>{
  const {data}=await db.auth.getSession();
  if(data.session)showApp(data.session);
})();
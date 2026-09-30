const SUPABASE_URL='https://kjmotqzbifxsnscvtysz.supabase.co';
const SUPABASE_KEY='sb_publishable_2LKsNXHeEemj9wnxr71eyw_ASH4ZFLK';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
let categories=[],staff=[],payments=[];
async function loadOptions(){
  const [{data:c,error:ce},{data:s,error:se},{data:p,error:pe}]=await Promise.all([
    db.rpc('kasir_get_kategori',{p_jenis:'pemasukan'}),db.rpc('kasir_get_penanggung_jawab'),db.rpc('kasir_get_metode_pembayaran')]);
  if(ce||se||pe) throw new Error('Gagal memuat master data'); categories=c||[];staff=s||[];payments=p||[];
  renderCategories();renderStaff();renderPayments();
}
function renderCategories(){const type=$('type').value;const names=type==='pemasukan'?categories:[];$('category').innerHTML=names.map(x=>`<option value="${x.id}">${x.nama}</option>`).join('');if(type==='pengeluaran') loadExpenseCategories();}
async function loadExpenseCategories(){const {data,error}=await db.rpc('kasir_get_kategori',{p_jenis:'pengeluaran'});if(!error)$('category').innerHTML=(data||[]).map(x=>`<option value="${x.id}">${x.nama}</option>`).join('');}
function renderStaff(){$('staff').innerHTML=staff.map(x=>`<option value="${x.id}">${x.nama}</option>`).join('')}
function renderPayments(){$('payment').innerHTML=payments.map(x=>`<option value="${x.id}">${x.nama||x.name}</option>`).join('')}
async function loadDashboard(){const {data,error}=await db.rpc('kasir_dashboard_hari_ini');if(error){$('message').textContent='Gagal memuat dashboard.';return}const d=Array.isArray(data)?data[0]:data;if(d){$('income').textContent=rupiah(d.total_pemasukan||d.pemasukan);$('expense').textContent=rupiah(d.total_pengeluaran||d.pengeluaran);$('balance').textContent=rupiah((d.saldo||0));}const h=await db.rpc('kasir_riwayat_hari_ini');const rows=h.data||[];$('transactionList').innerHTML=rows.map(x=>`<tr><td>${x.nomor_transaksi||x.transaction_no||'-'}</td><td>${x.catatan||x.note||'-'}</td><td>${rupiah(x.nominal||x.amount)}</td><td>${x.status||'Selesai'}</td></tr>`).join('')}
async function showApp(session){$('loginView').classList.add('hidden');$('appView').classList.remove('hidden');$('userLabel').textContent=session.user.email||'';try{await loadOptions();await loadDashboard()}catch(e){$('message').textContent=e.message}}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginMessage').textContent='Memproses...';const {data,error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error){$('loginMessage').textContent=error.message;return}showApp(data.session)});
$('logoutBtn').addEventListener('click',()=>db.auth.signOut());$('type').addEventListener('change',renderCategories);
$('transactionForm').addEventListener('submit',async e=>{e.preventDefault();$('message').textContent='Menyimpan...';const {data,error}=await db.rpc('kasir_input_transaksi',{p_jenis:$('type').value,p_kategori_id:Number($('category').value),p_penanggung_jawab_id:Number($('staff').value),p_metode_pembayaran_id:Number($('payment').value),p_nominal:Number($('amount').value),p_catatan:$('description').value.trim()+($('note').value.trim()?` — ${$('note').value.trim()}`:'')});if(error){$('message').textContent=error.message;return}$('message').textContent='Transaksi berhasil disimpan.';e.target.reset();await loadOptions();await loadDashboard();setTimeout(()=>$('message').textContent='',2500)});
db.auth.onAuthStateChange((event,session)=>{if(session&&event!=='SIGNED_OUT')showApp(session);else if(event==='SIGNED_OUT'){ $('appView').classList.add('hidden');$('loginView').classList.remove('hidden');}});
(async()=>{const {data}=await db.auth.getSession();if(data.session)showApp(data.session)})();

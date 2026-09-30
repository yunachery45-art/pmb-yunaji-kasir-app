(function(){
  const $$=id=>document.getElementById(id);
  const lockedPanels=new Set(['pelayananPanel','penjualanPanel','pengeluaranPanel']);
  let cashOpen=false;

  function injectStyles(){
    if($$('cashGuardStyles')) return;
    const s=document.createElement('style'); s.id='cashGuardStyles';
    s.textContent=`
      .cash-gate{margin-bottom:16px;border:1px solid #eadcff;background:linear-gradient(135deg,#fff,#faf4ff);border-radius:18px;padding:16px 18px;box-shadow:0 8px 24px rgba(109,63,179,.08)}
      .cash-gate.open{border-color:#ccefdc;background:linear-gradient(135deg,#fafffc,#f1fff7)}
      .cash-gate.closed{border-color:#f2cfe2;background:linear-gradient(135deg,#fff8fc,#faf4ff)}
      .cash-gate-row{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
      .cash-gate-title{font-weight:800;font-size:18px;color:#2d1b4e}.cash-gate-sub{margin:4px 0 0;color:#71677e;font-size:13px}
      .cash-gate-badge{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:8px 13px;font-weight:800;font-size:12px;background:#f0e5ff;color:#6d3fb3}
      .cash-gate.open .cash-gate-badge{background:#dcf8e9;color:#16834b}.cash-gate.closed .cash-gate-badge{background:#ffe7f2;color:#b51f6a}
      .cash-gate-btn{border:0;border-radius:11px;padding:11px 16px;font-weight:800;background:linear-gradient(135deg,#6d3fb3,#9b3be6);color:#fff;cursor:pointer;box-shadow:0 6px 16px rgba(109,63,179,.18)}
      .cash-locked{opacity:.52;position:relative}.cash-locked::after{content:'🔒 Kas belum dibuka';position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:10px;background:#fff0f7;color:#a62068;border:1px solid #f2c7dd;border-radius:999px;padding:4px 8px;pointer-events:none}
      .menu-card.cash-locked{cursor:not-allowed}
      .cash-card #closeCashBox{display:none!important}
      @media(max-width:720px){.cash-gate{padding:14px}.cash-gate-title{font-size:16px}.cash-gate-row{align-items:flex-start}.cash-gate-actions{width:100%}.cash-gate-btn{width:100%}.cash-locked::after{display:none}}
    `;document.head.appendChild(s);
  }

  function mountGate(){
    const content=document.querySelector('.content'); const welcome=document.querySelector('.welcome-card');
    if(!content||!welcome) return;
    let gate=$$('cashGate');
    if(!gate){
      gate=document.createElement('section'); gate.id='cashGate'; gate.className='cash-gate closed';
      gate.innerHTML=`<div class="cash-gate-row"><div><div class="cash-gate-title">💵 Kas Harian</div><p id="cashGateSub" class="cash-gate-sub">Kas belum dibuka. Pelayanan, penjualan, dan pengeluaran terkunci.</p></div><div class="cash-gate-actions"><span id="cashGateBadge" class="cash-gate-badge">🔒 BELUM DIBUKA</span> <button id="cashGateOpenBtn" class="cash-gate-btn">Buka Kas</button></div></div>`;
      welcome.insertAdjacentElement('afterend',gate);
    }
    const oldCash=document.querySelector('.cash-card');
    if(oldCash && oldCash.parentElement!==gate){ gate.insertAdjacentElement('afterend',oldCash); }
    const btn=$$('cashGateOpenBtn');
    if(btn&&!btn.dataset.bound){btn.dataset.bound='1';btn.onclick=()=>{const target=$$('openCashBox');if(target){target.scrollIntoView({behavior:'smooth',block:'center'});const input=$$('openingCash');if(input)setTimeout(()=>input.focus(),350)}}}
  }

  function applyLock(open){
    cashOpen=open;
    const gate=$$('cashGate'),badge=$$('cashGateBadge'),sub=$$('cashGateSub'),openBtn=$$('cashGateOpenBtn');
    if(gate){gate.classList.toggle('open',open);gate.classList.toggle('closed',!open)}
    if(badge)badge.textContent=open?'✓ KAS TERBUKA':'🔒 BELUM DIBUKA';
    if(sub)sub.textContent=open?'Kas aktif. Pelayanan, penjualan, dan pengeluaran dapat dilakukan.':'Kas belum dibuka. Pelayanan, penjualan, dan pengeluaran terkunci.';
    if(openBtn)openBtn.style.display=open?'none':'';
    document.querySelectorAll('.menu-card').forEach(b=>{
      const id=b.dataset.panel;
      if(lockedPanels.has(id)){
        b.classList.toggle('cash-locked',!open); b.setAttribute('aria-disabled',String(!open));
      }
    });
    ['pelayananForm','penjualanForm','pengeluaranForm'].forEach(fid=>{
      const form=$$(fid); if(!form)return;
      form.classList.toggle('cash-locked',!open);
      form.querySelectorAll('input,select,button,textarea').forEach(el=>{el.disabled=!open;});
    });
    const closeBox=$$('closeCashBox');
    if(closeBox)closeBox.classList.add('hidden');
  }

  async function refresh(){
    try{
      if(typeof window.cashStatus==='function') await window.cashStatus();
      const badge=($$('cashBadge')?.textContent||'').trim().toUpperCase();
      const open=badge==='TERBUKA';
      applyLock(open);
    }catch(e){console.warn('cash guard',e)}
  }

  function bindNavigation(){
    document.querySelectorAll('.menu-card').forEach(b=>{
      if(b.dataset.cashGuardBound)return;
      b.dataset.cashGuardBound='1';
      b.addEventListener('click',function(e){
        const id=b.dataset.panel;
        if(lockedPanels.has(id)&&!cashOpen){e.preventDefault();e.stopImmediatePropagation();alert('Kas hari ini belum dibuka. Silakan buka kas terlebih dahulu sebelum melakukan pelayanan, penjualan, atau pengeluaran.');const box=$$('openCashBox');if(box){box.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>$$('openingCash')?.focus(),350)}}
      },true);
    });
  }

  function bindCashButtons(){
    const b=$$('openCashBtn');
    if(b&&!b.dataset.cashGuardRefresh){b.dataset.cashGuardRefresh='1';b.addEventListener('click',()=>setTimeout(refresh,700));}
  }

  function start(){
    if(document.body.dataset.page!=='kasir')return;
    injectStyles();mountGate();bindNavigation();bindCashButtons();refresh();
    setInterval(()=>{mountGate();bindNavigation();bindCashButtons();refresh()},5000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,300));else setTimeout(start,300);
})();

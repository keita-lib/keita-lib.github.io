// app.js content here

// ========== 複利ミニシミュレーション ==========
/* Life×Money - app.js (mini-simulator + chart) */
document.addEventListener('DOMContentLoaded', () => {
  const p = document.getElementById('principal');
  const r = document.getElementById('rate');
  const y = document.getElementById('years');
  const result = document.getElementById('sim-result');
  const chipP = document.getElementById('chip-p');
  const chipR = document.getElementById('chip-r');
  const chipY = document.getElementById('chip-y');
  const canvas = document.getElementById('sim-chart');

  if (!p || !r || !y || !result || !chipP || !chipR || !chipY) return;

  const yen = new Intl.NumberFormat('ja-JP');

  function updateTrack(el){
    // WebKit系用：入力要素自体の背景を進捗で塗る
    const min = +el.min || 0, max = +el.max || 100, val = +el.value || 0;
    const pct = ((val - min) / (max - min)) * 100;
    el.style.background =
      `linear-gradient(90deg, var(--accent) 0%, var(--accent) ${pct}%, #aeb6c2 ${pct}%, #aeb6c2 100%)`;
  }

  // 将来価値からステータス名を返す
  function getWealthStatus(v) {
    if (v >= 500_000_000) return '超富裕層';
    if (v >= 100_000_000) return '富裕層';
    if (v >= 50_000_000)  return '準富裕層';
    if (v >= 30_000_000)  return 'アッパーマス';
    return '一般庶民'; // 基準未満は表示しない（必要なら「—」等に）
    }

    // 角丸ピルを描く
    function drawPill(ctx, x, y, text) {
    const padX = 8, padY = 4, r = 12;
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans JP", sans-serif';
    const w = Math.ceil(ctx.measureText(text).width) + padX*2;
    const h = 22; // 見た目を揃える固定高
    const left = x, top = y, right = x + w, bottom = y + h;

    ctx.beginPath();
    ctx.moveTo(left + r, top);
    ctx.arcTo(right, top, right, bottom, r);
    ctx.arcTo(right, bottom, left, bottom, r);
    ctx.arcTo(left, bottom, left, top, r);
    ctx.arcTo(left, top, right, top, r);
    ctx.closePath();

    ctx.fillStyle = 'rgba(8,34,58,.85)';     // 濃い紺の塗り
    ctx.strokeStyle = 'rgba(63,179,255,.9)'; // アクセント枠
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(text, left + padX, top + h/2);
    }

    // ラインチャート描画（素のCanvas） — 横軸に年数ラベルを追加
  function drawChart(principal, rate, years) {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 560;
    const cssH = canvas.clientHeight || 320;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const padL = 32, padT = 18, padR = 18, padB = 36;
    const W = cssW - padL - padR;
    const H = cssH - padT - padB;

    // データ作成
    const xs = [], ys = [];
    let maxV = principal;
    for (let i=0; i<=years; i++){
        const fv = principal * Math.pow(1+rate, i);
        xs.push(i); ys.push(fv);
        if (fv > maxV) maxV = fv;
    }

    // 軸
    ctx.strokeStyle = 'rgba(16,42,77,.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, cssH - padB); ctx.lineTo(cssW - padR, cssH - padB);
    ctx.moveTo(padL, cssH - padB); ctx.lineTo(padL, padT);
    ctx.stroke();

    // Y目盛り
    ctx.fillStyle = 'rgba(16,42,77,.55)';
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans JP", sans-serif';
    const yTicks = 3, yenFmt = v => `¥${yen.format(Math.round(v))}`;
    for (let t=0; t<=yTicks; t++){
        const v = maxV * t / yTicks;
        const yPos = cssH - padB - (H * t / yTicks);
        ctx.fillText(yenFmt(v), 8, yPos+4);
        ctx.strokeStyle = 'rgba(16,42,77,.08)';
        ctx.beginPath(); ctx.moveTo(padL, yPos); ctx.lineTo(cssW - padR, yPos); ctx.stroke();
    }

    // X目盛り（年数）
    const maxXTicks = 6;
    const step = Math.max(1, Math.ceil(years / maxXTicks));
    ctx.fillStyle = 'rgba(16,42,77,.65)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= years; i += step) {
        const xPix = padL + (W * i / (years || 1));
        const yBase = cssH - padB;
        ctx.strokeStyle = 'rgba(16,42,77,.08)';
        ctx.beginPath(); ctx.moveTo(xPix, yBase); ctx.lineTo(xPix, padT); ctx.stroke();
        ctx.fillText(`${i}年`, xPix, yBase + 6);
    }
    if (years % step !== 0) {
        ctx.fillText(`${years}年`, padL + W, cssH - padB + 6);
    }

    // 折れ線
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#3fb3ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i=0; i<xs.length; i++){
        const xPix = padL + (W * xs[i] / (years || 1));
        const yPix = cssH - padB - (H * (ys[i]/maxV));
        if (i===0) ctx.moveTo(xPix, yPix); else ctx.lineTo(xPix, yPix);
    }
    ctx.stroke();

    // 現在年マーカー
    const xNow = padL + (W * years / (years || 1));
    const yNow = cssH - padB - (H * (ys[ys.length-1]/maxV));
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(16,42,77,.6)';
    ctx.beginPath(); ctx.arc(xNow, yNow, 4, 0, Math.PI*2); ctx.fill(); ctx.stroke();

    // ★ ステータス表示（将来価値に応じて）
    const fvEnd = ys[ys.length - 1];
    const status = getWealthStatus(fvEnd);
    if (status) {
        // 右側にピルを描く（はみ出し防止で位置調整）
        const pillX = Math.min(padL + W - 120, xNow + 8);
        const pillY = Math.max(padT + 6, yNow - 14);
        drawPill(ctx, pillX, pillY, status);
    }
    }

  function update(){
    const principal = +p.value;
    const rate = (+r.value) / 100;
    const years = +y.value;

    const fv = Math.round(principal * Math.pow(1 + rate, years));

    chipP.textContent = `¥${yen.format(principal)}`;
    chipR.textContent = `${(rate*100).toFixed(1)}%`;
    chipY.textContent = `${years}年`;
    result.textContent = `将来価値: ¥${yen.format(fv)}`;

      // ★ ここでバッジ更新
    const badge = document.getElementById('sim-status');
    if (badge) {
        const info = getWealthStatusInfo(fv);
        if (info.label) {
        badge.textContent = info.label;
        badge.className = 'badge-status ' + info.cls;
        badge.style.display = 'inline-flex';
        } else {
        badge.style.display = 'none';
        }
    }


    updateTrack(p); updateTrack(r); updateTrack(y);
    drawChart(principal, rate, years);
  }




  ['input','change'].forEach(ev => {
    p.addEventListener(ev, update);
    r.addEventListener(ev, update);
    y.addEventListener(ev, update);
  });

  update(); // 初期表示
});



// ========== ここから下に他のスクリプトを追加してOK ==========

// 将来価値→ステータス情報
  function getWealthStatusInfo(v) {
    if (v >= 500_000_000) return { label: '超富裕層', cls: 'status-ultra' };
    if (v >= 100_000_000) return { label: '富裕層',  cls: 'status-wealthy' };
    if (v >= 50_000_000)  return { label: '準富裕層', cls: 'status-prewealthy' };
    if (v >= 30_000_000)  return { label: 'アッパーマス', cls: 'status-uppermass' };
    return { label: '一般大衆', cls: 'status-mass' };
    }









// スライダーの進捗トラック色を現在値に同期
features.register(() => {
  const upd = (el) => {
    if (!el || el.type !== 'range') return;
    const min = Number(el.min || 0), max = Number(el.max || 100), val = Number(el.value || 0);
    const pct = ((val - min) / (max - min)) * 100;
    el.style.background = `linear-gradient(90deg, var(--accent) 0%, var(--accent) ${pct}%, #aeb6c2 ${pct}%, #aeb6c2 100%)`;
  };
  const ranges = $$('.range');
  ranges.forEach(r => { upd(r); ['input','change'].forEach(e => r.addEventListener(e, () => upd(r))); });
});

// assets/app.js の末尾に追記
(function () {
  // ページ内アンカーへのクリックを横取りして滑らかにスクロール
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const headerOffset = 80; // ヘッダー分の余白（styles.cssのscroll-margin-topと揃える）

  const samePageAnchor = (a) => {
    const href = a.getAttribute('href');
    return href && href.startsWith('#') && document.querySelector(href);
  };

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = samePageAnchor(a);
    if (!target) return;

    e.preventDefault();

    // アクセシビリティ尊重：OSで「動きを減らす」がONなら即時移動
    if (prefersReduced) {
      target.scrollIntoView({ block: 'start' });
      return;
    }

    // たしかなスムーススクロール（古いSafari対策で scrollTo も使う）
    const top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
    if ('scrollBehavior' in document.documentElement.style) {
      window.scrollTo({ top, behavior: 'smooth' });
    } else {
      // 最低限のフォールバック（即時）
      window.scrollTo(0, top);
    }
  });
})();






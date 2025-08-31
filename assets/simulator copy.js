/* Life×Money — simulator add-ons
   - PNG保存（資産/インカム）
   - CSVエクスポート（資産/インカム）
   - 設定の共有URL（読み込み＆自動更新）
   既存の simulator.html を壊さない “後付け拡張” です。
*/

(function(){
  // ====== 内部状態（エクスポート用に最新系列を保持） ======
  let LM_seriesAssets = { labels: [], mid: [], low: [], high: [] };
  let LM_seriesIncome = { labels: [], mid: [], low: [], high: [] };

  // ====== 共有URL ======
  function LM_saveStateToURL() {
    try {
      if (!window.state) return;
      const p = new URLSearchParams();
      Object.entries(window.state).forEach(([k, v]) => p.set(k, String(v)));
      history.replaceState(null, '', '?' + p.toString());
    } catch (e) {
      // noop
    }
  }

  function LM_loadStateFromURL() {
    try {
      if (!window.state) return false;
      const p = new URLSearchParams(location.search);
      let touched = false;
      p.forEach((v, k) => {
        if (Object.prototype.hasOwnProperty.call(window.state, k)) {
          const num = Number(v);
          window.state[k] = Number.isNaN(num) ? v : num;
          touched = true;
        }
      });
      return touched;
    } catch (e) {
      return false;
    }
  }

  // ====== ダウンロード系 ======
  function LM_downloadPNG(chart, filename){
    try{
      const a = document.createElement('a');
      a.href = chart.toBase64Image();
      a.download = filename;
      a.click();
    }catch(e){ console.warn(e); }
  }

  function LM_exportCSV(series, filename){
    try{
      const rows = [['Year','Median','P05','P95']];
      series.labels.forEach((lab,i)=>rows.push([lab, series.mid[i], series.low[i], series.high[i]]));
      const blob = new Blob([rows.map(r=>r.join(',')).join('\n')], {type:'text/csv'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    }catch(e){ console.warn(e); }
  }

  // ====== ツールバー（各キャンバスの直下に差し込む） ======
  function LM_attachToolbar(canvasId, kind){
    const c = document.getElementById(canvasId);
    if (!c) return;
    // 二重作成防止
    if (c.nextElementSibling && c.nextElementSibling.dataset && c.nextElementSibling.dataset.lmToolbar === '1') return;

    const bar = document.createElement('div');
    bar.dataset.lmToolbar = '1';
    bar.style.margin = '8px 0 0';
    bar.style.display = 'flex';
    bar.style.flexWrap = 'wrap';
    bar.style.gap = '8px';

    const mkBtn = (label) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.padding = '6px 10px';
      b.style.border = '1px solid #cbd5e1';
      b.style.borderRadius = '8px';
      b.style.background = '#fff';
      b.style.cursor = 'pointer';
      b.onmouseenter = ()=> b.style.background = '#f8fafc';
      b.onmouseleave = ()=> b.style.background = '#fff';
      return b;
    };

    const btnPNG = mkBtn(kind + 'グラフをPNG保存');
    const btnCSV = mkBtn(kind + 'データをCSV保存');

    btnPNG.addEventListener('click', ()=>{
      if (kind === '資産') LM_downloadPNG(window.assetsChart, 'assets.png');
      else LM_downloadPNG(window.incomeChart, 'income.png');
    });

    btnCSV.addEventListener('click', ()=>{
      if (kind === '資産') LM_exportCSV(LM_seriesAssets, 'assets.csv');
      else LM_exportCSV(LM_seriesIncome, 'income.csv');
    });

    bar.appendChild(btnPNG);
    bar.appendChild(btnCSV);

    // 資産側にだけ「共有リンクコピー」
    if (kind === '資産') {
      const btnShare = mkBtn('設定の共有リンクをコピー');
      btnShare.addEventListener('click', ()=>{
        LM_saveStateToURL();
        navigator.clipboard?.writeText(location.href).then(()=>{
          const prev = btnShare.textContent;
          btnShare.textContent = 'コピーしました！';
          setTimeout(()=> btnShare.textContent = prev, 1200);
        });
      });
      bar.appendChild(btnShare);
    }

    c.insertAdjacentElement('afterend', bar);
  }

  // ====== updateAll を拡張（ラップ） ======
  function LM_patchUpdateAll(){
    if (!window.updateAll || window.__lmPatchedUpdateAll) return;
    const orig = window.updateAll;
    window.updateAll = function(){
      // 元の描画を実行
      orig.apply(this, arguments);

      try{
        // 1) チャートから “いま描かれている系列” を回収（中央値・5%・95% の順で入っている想定）
        if (window.assetsChart) {
          const dsA = window.assetsChart.data.datasets || [];
          LM_seriesAssets = {
            labels: (window.assetsChart.data.labels || []).slice(),
            mid:  (dsA[0]?.data || []).slice(),
            low:  (dsA[1]?.data || []).slice(),
            high: (dsA[2]?.data || []).slice(),
          };
        }
        if (window.incomeChart) {
          const dsI = window.incomeChart.data.datasets || [];
          LM_seriesIncome = {
            labels: (window.incomeChart.data.labels || []).slice(),
            mid:  (dsI[0]?.data || []).slice(),
            low:  (dsI[1]?.data || []).slice(),
            high: (dsI[2]?.data || []).slice(),
          };
        }

        // 2) 設定をURLへ反映（入力の度に最新化）
        LM_saveStateToURL();
      }catch(e){ /* no-op */ }
    };
    window.__lmPatchedUpdateAll = true;
  }

  // ====== 初期化：URL→state 反映、ツールバー設置、パッチ適用 ======
  function LM_bootstrap(){
    // URL→state（できれば初回描画前に）
    const loaded = LM_loadStateFromURL();
    // 既に buildCharts→updateAll が実行された後でも、次回更新でURLを反映できるように
    // ここで updateAll を呼べるなら呼ぶ
    if (loaded && typeof window.updateAll === 'function') {
      try { window.updateAll(); } catch(e){}
    }

    // チャート準備を待ってツールバー設置＆パッチ適用
    let tries = 0;
    (function waitForCharts(){
      tries++;
      if (window.assetsChart && window.incomeChart && typeof window.updateAll === 'function') {
        // 一回だけ設置
        LM_attachToolbar('assetsChart', '資産');
        LM_attachToolbar('incomeChart', 'インカム');
        LM_patchUpdateAll();
        return;
      }
      if (tries < 300) { // 最大 ~5秒 (16ms * 300)
        requestAnimationFrame(waitForCharts);
      } else {
        // 最悪でもパッチは試みる
        LM_patchUpdateAll();
      }
    })();
  }

  // ====== 起動（DOMContentLoaded 後に走らせる） ======
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', LM_bootstrap);
  } else {
    LM_bootstrap();
  }
})();


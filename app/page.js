"use client";

import { useEffect, useMemo, useState } from "react";

const yen = n => new Intl.NumberFormat("ja-JP",{style:"currency",currency:"JPY",maximumFractionDigits:0}).format(Number(n||0));
const usd = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(Number(n||0));
const num = n => new Intl.NumberFormat("ja-JP",{maximumFractionDigits:2}).format(Number(n||0));

export default function Page() {
  const [asset,setAsset] = useState("MSTR");
  const [live,setLive] = useState(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [holdings,setHoldings] = useState("");
  const [shares,setShares] = useState("");
  const [average,setAverage] = useState("1.35");

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(`btc-premium-${asset}`) || "{}");
    setHoldings(stored.holdings || "");
    setShares(stored.shares || "");
    setAverage(String(stored.average || (asset === "MSTR" ? 1.35 : 1.25)));
    refresh(asset);
  }, [asset]);

  useEffect(() => {
    localStorage.setItem(`btc-premium-${asset}`, JSON.stringify({ holdings, shares, average }));
  }, [asset,holdings,shares,average]);

  async function refresh(target = asset) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/market?asset=${target}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "取得に失敗しました");
      setLive(json);
      setHoldings(h => h || String(json.holdings || ""));
      setShares(s => s || String(json.shares || ""));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const calc = useMemo(() => {
    if (!live) return null;
    const h = Number(holdings || live.holdings || 0);
    const s = Number(shares || live.shares || 0);
    const stockJpy = asset === "MSTR" ? live.stockPrice * live.usdJpy : live.stockPrice;
    const btcValue = h * live.btcJpy;
    const marketCap = s * stockJpy;
    const multiple = btcValue > 0 ? marketCap / btcValue : 0;
    const avg = Number(average || 0);
    const gap = avg > 0 ? multiple / avg - 1 : 0;
    const fairMarketCap = btcValue * avg;
    const fairPriceJpy = s > 0 ? fairMarketCap / s : 0;
    const upside = stockJpy > 0 ? fairPriceJpy / stockJpy - 1 : 0;
    return { h,s,stockJpy,btcValue,marketCap,multiple,avg,gap,fairPriceJpy,upside };
  }, [live,holdings,shares,average,asset]);

  let verdict = "判定不能";
  let cls = "warn";
  if (calc) {
    if (calc.gap <= -0.20) { verdict = "かなり割安"; cls = "good"; }
    else if (calc.gap <= -0.08) { verdict = "割安"; cls = "good"; }
    else if (calc.gap < 0.08) { verdict = "平均付近"; cls = "warn"; }
    else if (calc.gap < 0.20) { verdict = "割高"; cls = "bad"; }
    else { verdict = "かなり割高"; cls = "bad"; }
  }

  return (
    <main>
      <h1>BTC Premium Index</h1>
      <div className="subtitle">
        MSTR・メタプラネットの時価総額が、保有BTC価値に対して過去平均より高いか安いかを表示します。
      </div>

      <div className="tabs">
        <button className={asset==="MSTR"?"active":""} onClick={()=>setAsset("MSTR")}>MSTR</button>
        <button className={asset==="META"?"active":""} onClick={()=>setAsset("META")}>メタプラネット</button>
      </div>

      <section className="card status">
        <div className="statusText">
          {error ? <span className="error">{error}</span> :
           live ? <>最終更新：{new Date(live.updatedAt).toLocaleString("ja-JP")}<br/>BTC・株価・為替は自動取得</> :
           "まだ取得していません"}
        </div>
        <button className="refresh" onClick={()=>refresh()} disabled={loading}>
          {loading ? "更新中…" : "最新情報を更新"}
        </button>
      </section>

      {live && calc && (
        <>
          <section className="card">
            <div className="hero">
              <div className="box">
                <div className="label">現在のプレミアム倍率</div>
                <div className="big">{calc.multiple.toFixed(2)}倍</div>
                <div className="small">時価総額 ÷ 保有BTC総額</div>
              </div>
              <div className={`box judge ${cls}`}>{verdict}</div>
            </div>
          </section>

          <section className="card">
            <h2>現在値</h2>
            <div className="kpis">
              <div className="kpi"><div className="label">BTC価格</div><div className="value">{usd(live.btcUsd)}</div><div className="small">{yen(live.btcJpy)}</div></div>
              <div className="kpi"><div className="label">株価</div><div className="value">{asset==="MSTR"?usd(live.stockPrice):yen(live.stockPrice)}</div></div>
              <div className="kpi"><div className="label">保有BTC総額</div><div className="value">{yen(calc.btcValue)}</div></div>
              <div className="kpi"><div className="label">時価総額</div><div className="value">{yen(calc.marketCap)}</div></div>
            </div>
          </section>

          <section className="card">
            <h2>平均との比較</h2>
            <div className="kpis">
              <div className="kpi"><div className="label">過去平均倍率</div><div className="value">{calc.avg.toFixed(2)}倍</div></div>
              <div className="kpi"><div className="label">平均との乖離</div><div className={`value ${calc.gap<0?"good":"bad"}`}>{calc.gap>=0?"+":""}{(calc.gap*100).toFixed(1)}%</div></div>
              <div className="kpi"><div className="label">平均時の理論株価</div><div className="value">{yen(calc.fairPriceJpy)}</div>{asset==="MSTR"&&<div className="small">{usd(calc.fairPriceJpy/live.usdJpy)}</div>}</div>
              <div className="kpi"><div className="label">現在株価との差</div><div className={`value ${calc.upside>0?"good":"bad"}`}>{calc.upside>=0?"+":""}{(calc.upside*100).toFixed(1)}%</div></div>
            </div>
          </section>

          <section className="card">
            <h2>判定</h2>
            <div className="report">
              現在倍率は <strong>{calc.multiple.toFixed(2)}倍</strong>、
              過去平均は <strong>{calc.avg.toFixed(2)}倍</strong> です。
              現在は平均より <strong className={calc.gap<0?"good":"bad"}>
                {Math.abs(calc.gap*100).toFixed(1)}% {calc.gap<0?"低い":"高い"}
              </strong> 水準です。
              平均倍率まで戻ると仮定した理論株価は <strong>{yen(calc.fairPriceJpy)}</strong> です。
              <br/><br/>
              <span className="small">過去平均への回帰を保証するものではありません。</span>
            </div>
          </section>

          <section className="card">
            <h2>会社データ</h2>
            <div className="fields">
              <div><label>保有BTC数</label><input value={holdings} onChange={e=>setHoldings(e.target.value)} /></div>
              <div><label>発行済株式数</label><input value={shares} onChange={e=>setShares(e.target.value)} /></div>
              <div><label>過去平均倍率</label><input value={average} onChange={e=>setAverage(e.target.value)} /></div>
              <div><label>USD/JPY</label><input value={num(live.usdJpy)} readOnly /></div>
            </div>
            <p className="small">保有BTC数・株式数・平均倍率は画面から修正できます。設定は端末に保存されます。</p>
          </section>
        </>
      )}
    </main>
  );
}

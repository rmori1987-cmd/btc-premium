export const dynamic = "force-dynamic";

const defaults = {
  MSTR: {
    yahoo: "MSTR",
    currency: "USD",
    holdings: 847363,
    shares: 358900000,
  },
  META: {
    yahoo: "3350.T",
    currency: "JPY",
    holdings: 43000,
    shares: 1156261361,
  },
};

async function yahooQuote(symbol) {
  const endpoint = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!response.ok) throw new Error(`株価取得エラー HTTP ${response.status}`);
  const json = await response.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) throw new Error("株価を取得できません");
  return {
    price: Number(meta.regularMarketPrice),
    shares: Number(meta.sharesOutstanding || 0),
  };
}

async function bitcoinPrice() {
  const endpoint = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,jpy&include_24hr_change=true";
  const response = await fetch(endpoint, {
    cache: "no-store",
    headers: { "Accept": "application/json" },
  });
  if (!response.ok) throw new Error(`BTC取得エラー HTTP ${response.status}`);
  const bitcoin = (await response.json())?.bitcoin;
  if (!bitcoin?.usd || !bitcoin?.jpy) throw new Error("BTC価格を取得できません");
  return bitcoin;
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const asset = url.searchParams.get("asset") === "META" ? "META" : "MSTR";
    const cfg = defaults[asset];

    const [stock, btc, fx] = await Promise.all([
      yahooQuote(cfg.yahoo),
      bitcoinPrice(),
      yahooQuote("JPY=X"),
    ]);

    return Response.json({
      asset,
      stockPrice: stock.price,
      stockCurrency: cfg.currency,
      btcUsd: btc.usd,
      btcJpy: btc.jpy,
      usdJpy: fx.price || btc.jpy / btc.usd,
      holdings: cfg.holdings,
      shares: stock.shares || cfg.shares,
      updatedAt: new Date().toISOString(),
      sources: {
        stock: "Yahoo Finance",
        btc: "CoinGecko",
        holdings: "初期値（画面で修正可能）",
        shares: stock.shares ? "Yahoo Finance" : "初期値（画面で修正可能）",
      },
    }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return Response.json(
      { error: error?.message || "最新情報を取得できませんでした" },
      { status: 500 }
    );
  }
}

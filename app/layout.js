import "./globals.css";

export const metadata = {
  title: "BTC Premium Index",
  description: "MSTR・メタプラネットのBTCプレミアム倍率を表示",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

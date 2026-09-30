import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CoalSMART · Mine intelligence",
  description:
    "Explore evidence-backed mine intelligence in a clearly labeled sample-data sandbox.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

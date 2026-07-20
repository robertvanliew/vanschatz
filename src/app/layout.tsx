import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import MotionProvider from "@/components/MotionProvider";
import "./globals.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});
const sans = Jost({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Julie & Robert — October 17, 2026",
  description:
    "Join Julie & Robert beneath the wisteria. Saturday, October 17, 2026 · Lakeview House, Newburgh, NY.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}

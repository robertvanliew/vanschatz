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
  metadataBase: new URL("https://thevanschatz.com"),
  title: "Julie & Robert — October 17, 2026",
  description:
    "Join Julie & Robert beneath the wisteria. Saturday, October 17, 2026 · Lakeview House, Newburgh, NY.",
  openGraph: {
    title: "Julie & Robert are getting married",
    description: "Saturday, October 17, 2026 · Lakeview House, Newburgh, NY — tap to RSVP.",
    url: "https://thevanschatz.com",
    siteName: "Julie & Robert",
    type: "website",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Julie & Robert — You're Invited" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Julie & Robert are getting married",
    description: "Saturday, October 17, 2026 · Lakeview House, Newburgh, NY — tap to RSVP.",
    images: ["/og-image.jpg"],
  },
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

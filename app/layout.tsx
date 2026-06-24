import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import QueryProvider from "./lib/query-provider";
import { ThemeProvider } from "@/app/_components/theme/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FloodGuard — Real-Time Flood Early Warning System",
  description:
    "Stay ahead of floods. Real-time water level monitoring, community alerts, and evacuation coordination for vulnerable communities.",
};

// Set theme before first paint to avoid flash
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('fg-theme') || 'light';
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-app text-app">
        <QueryProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

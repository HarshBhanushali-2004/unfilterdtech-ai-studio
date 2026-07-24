import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "UnfilterdTech AI Studio",
  description:
    "AI-powered platform to generate Instagram posts, stories, carousels and reels.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>    
    </html>
  );
}
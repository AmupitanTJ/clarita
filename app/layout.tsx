import type { Metadata, Viewport } from "next";
import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clarita — Scripture for the moment you're in",
  description:
    "A gentle, Scripture-grounded companion for reflection and Bible study.",
  applicationName: "Clarita",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/clarita-favicon-v2.svg", type: "image/svg+xml" }],
    shortcut: ["/clarita-favicon-v2.svg"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF7EF" },
    { media: "(prefers-color-scheme: dark)", color: "#101817" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const saved=localStorage.getItem("clarita-theme");const theme=saved==="dark"||saved==="light"?saved:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme}catch{}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

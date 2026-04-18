import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import "@/app/globals.css";
import { UiProvider } from "@/components/ui/ui-provider";

export const metadata: Metadata = {
  title: "AgentPaywall",
  description:
    "Tempo + MPP pay-per-call gateway for premium APIs and digital services.",
  icons: {
    icon: [
      { url: "/logo-mark.svg", type: "image/svg+xml" },
    ],
    shortcut: "/logo-mark.svg",
    apple: "/logo-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={GeistSans.className}>
        <AntdRegistry>
          <UiProvider>{children}</UiProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}

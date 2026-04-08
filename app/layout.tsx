import type { Metadata } from "next";
import { Outfit, Geist, Modak } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import { Header } from "@/components/Header";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});
const modak = Modak({ weight: '400', subsets: ['latin'], variable: '--font-modak' });

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "avia!",
  description:
    "Ferramentas para agilizar o processo de produção cultural.",
};

import { ThemeProvider } from "@/components/theme-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable, modak.variable)} suppressHydrationWarning>
      <body className={`${outfit.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={<div>Carregando aplicação...</div>}>
            <ClerkProvider dynamic>
              <Header />
              {children}
              <Toaster richColors position="bottom-right" />
            </ClerkProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Outfit, Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Suspense } from "react";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Avia!",
  description:
    "Ferramentas para auxiliar o processo de produção cultural.",
};

import { ThemeProvider } from "@/components/theme-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body className={`${outfit.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={<div>Carregando aplicação...</div>}>
            <ClerkProvider dynamic>
              {children}
              <Toaster richColors position="bottom-right" />
            </ClerkProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}

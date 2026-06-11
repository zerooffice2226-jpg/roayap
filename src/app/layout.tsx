import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import SideNav from "@/app/components/SideNav";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Odoo Accounting",
  description: "Modern Accounting ERP based on Odoo principles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
          <div className="w-full flex-none md:w-64">
            <Suspense fallback={<div className="w-64 bg-slate-950 h-screen" />}>
              <SideNav />
            </Suspense>
          </div>
          <div className="flex-grow p-6 md:overflow-y-auto md:p-12">{children}</div>
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crystal Quest - A JRPG Adventure",
  description: "A pixel art JRPG with turn-based battles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full flex items-center justify-center bg-black">
        {children}
      </body>
    </html>
  );
}

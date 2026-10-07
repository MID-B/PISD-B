import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Andima MID",
  description: "Aplikasi Andima MID",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}

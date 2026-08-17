import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maruti Galaxy",
  description: "Diamond polishing and cutting job-work operations",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

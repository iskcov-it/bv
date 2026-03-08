import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ISKCON Sadhana Chart",
  description: "Sadhana chart with devotee, leader, and superadmin reporting"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

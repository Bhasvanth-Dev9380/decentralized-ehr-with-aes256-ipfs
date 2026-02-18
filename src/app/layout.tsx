import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedChain - Blockchain Medical Records",
  description: "Secure blockchain-based medical record storage with AES-256 encryption",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}

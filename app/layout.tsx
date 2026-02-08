import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AOL Chat - You've Got Mail!",
  description: "A retro AOL Instant Messenger chat experience",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

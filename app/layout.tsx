import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eduflux",
  description: "AI-powered tools for modern education.",
  manifest: "/manifest.json",
  themeColor: "#4f46e5",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Eduflux",
    // startupImage: [], // You can add startup images for different devices here
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "@/styles/app.css";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  metadataBase: new URL("https://neurodb-web.buildc3.tech"),
  title: "NeuroDB Web — AI-Powered PostgreSQL Management in Your Browser",
  description:
    "NeuroDB Web is AI-powered PostgreSQL management in your browser. Generate, run and explore queries with natural language.",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "NeuroDB Web",
    title: "NeuroDB Web — AI-Powered PostgreSQL Management in Your Browser",
    description:
      "NeuroDB Web is AI-powered PostgreSQL management in your browser. Generate, run and explore queries with natural language.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "NeuroDB Web — AI-Powered PostgreSQL Management in Your Browser",
    description:
      "NeuroDB Web is AI-powered PostgreSQL management in your browser. Generate, run and explore queries with natural language.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "NeuroDB Web",
  url: "https://neurodb-web.buildc3.tech/",
  description:
    "NeuroDB Web is AI-powered PostgreSQL management in your browser. Generate, run and explore queries with natural language.",
  publisher: { "@type": "Organization", name: "BuildC3", url: "https://buildc3.tech/" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

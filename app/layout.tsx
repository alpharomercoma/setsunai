import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Setsunai - Private Encrypted Thoughts",
  description: "Your private, end-to-end encrypted space for thoughts. Only you can read them. Open source.",
  generator: "v0.app",
  keywords: ["private journal", "encrypted thoughts", "secure notes", "personal diary", "end-to-end encryption"],
  authors: [{ name: "Alpha Romer Coma", url: "https://www.linkedin.com/in/alpharomercoma/" }],
  openGraph: {
    title: "Setsunai - Private Encrypted Thoughts",
    description: "Your private, end-to-end encrypted space for thoughts. Only you can read them.",
    type: "website",
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}

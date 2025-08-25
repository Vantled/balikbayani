import * as React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { ConditionalFooter } from "@/components/conditional-footer"
import { NavigationToastHandler } from "@/components/navigation-toast-handler"
import FirstTimeLoginHandler from "@/components/first-time-login-handler"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "BalikBayani Portal",
  description: "BalikBayani Portal - Your trusted platform for overseas employment",
  keywords: ["overseas employment", "job portal", "Philippines", "government portal"],
  authors: [{ name: "BalikBayani Team" }],
  robots: "index, follow",
  generator: 'Next.js',
  applicationName: 'BalikBayani Portal',
  referrer: 'origin-when-cross-origin',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <Toaster />
          <NavigationToastHandler />
          <FirstTimeLoginHandler />
          <div className="flex flex-col bg-[#EEF5FD]">
            <main className="flex-1">
              {children}
            </main>
            <ConditionalFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

import * as React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "react-hot-toast"
import { usePathname } from "next/navigation"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "BalikBayani Portal",
  description: "BalikBayani Portal - Your trusted platform for overseas employment",
  keywords: ["overseas employment", "job portal", "Philippines", "government portal"],
  authors: [{ name: "BalikBayani Team" }],
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  robots: "index, follow",
  generator: 'Next.js',
  applicationName: 'BalikBayani Portal',
  referrer: 'origin-when-cross-origin',
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
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isDashboard = pathname === "/dashboard";
  const isInfoSheet = pathname.startsWith("/information-sheet");

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <Toaster 
            position="top-center" 
            toastOptions={{ 
              className: 'text-sm font-medium',
              duration: 5000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }} 
          />
          <div className="flex flex-col min-h-screen bg-[#EEF5FD]">
            <main className="flex-1">
              {children}
            </main>
            {isDashboard || isInfoSheet ? (
              <footer className="bg-white p-4 text-center text-xs text-gray-500 border-t border-gray-200 mt-auto">
                <p>© 2025 BalikBayani Portal. All rights reserved.</p>
                <p>This is a secure government system. Unauthorized access is prohibited and subject to legal action.</p>
              </footer>
            ) : (
              <footer className="fixed bottom-0 left-0 w-full bg-white p-4 text-center text-xs text-gray-500 z-50">
                <p>© 2025 BalikBayani Portal. All rights reserved.</p>
                <p>This is a secure government system. Unauthorized access is prohibited and subject to legal action.</p>
              </footer>
            )}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

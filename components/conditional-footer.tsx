// components/conditional-footer.tsx
"use client"

import { usePathname } from "next/navigation"

export function ConditionalFooter() {
  const pathname = usePathname()
  const isDashboard = pathname === "/dashboard"
  const isInfoSheet = pathname.startsWith("/information-sheet")
  const isAuthPage = pathname === "/login" || pathname === "/register"
  const isApplicant = pathname.startsWith("/applicant")

  if (isDashboard || isInfoSheet) {
    return (
      <footer className="p-4 text-center text-xs text-gray-500 mt-auto">
        <p>© 2025 BalikBayani Portal. All rights reserved.</p>
        <p>This is a secure government system. Unauthorized access is prohibited and subject to legal action.</p>
      </footer>
    )
  }

  const baseFooter =
    <footer className="w-full p-4 text-center text-xs text-gray-500 bg-white/90 border-t border-gray-200">
      <p>© 2025 BalikBayani Portal. All rights reserved.</p>
      <p>This is a secure government system. Unauthorized access is prohibited and subject to legal action.</p>
    </footer>

  if (isAuthPage || isApplicant) {
    const authFooter =
      <footer className="w-full p-2 text-center text-xs text-gray-500">
        <p>© 2025 BalikBayani Portal. All rights reserved.</p>
        <p>This is a secure government system. Unauthorized access is prohibited and subject to legal action.</p>
      </footer>
    return (
      <div className="sm:fixed sm:bottom-0 sm:left-0 w-full z-40">
        {authFooter}
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 w-full z-40">
      {baseFooter}
    </div>
  )
}

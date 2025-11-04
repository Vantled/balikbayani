// components/conditional-footer.tsx
"use client"

import { usePathname } from "next/navigation"

export function ConditionalFooter() {
  const pathname = usePathname()
  const isDashboard = pathname === "/dashboard"
  const isInfoSheet = pathname.startsWith("/information-sheet")

  if (isDashboard || isInfoSheet) {
    return (
      <footer className="p-4 text-center text-xs text-gray-500 mt-auto">
        <p>© 2025 BalikBayani Portal. All rights reserved.</p>
        <p>This is a secure government system. Unauthorized access is prohibited and subject to legal action.</p>
      </footer>
    )
  }

  return (
    <footer className="fixed bottom-0 left-0 w-full p-4 text-center text-xs text-gray-500 z-40">
      <p>© 2025 BalikBayani Portal. All rights reserved.</p>
      <p>This is a secure government system. Unauthorized access is prohibited and subject to legal action.</p>
    </footer>
  )
}

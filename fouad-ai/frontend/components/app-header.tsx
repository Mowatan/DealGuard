"use client"

import Link from "next/link"
import { Bell, Shield } from "lucide-react"
import { UserButton } from "@clerk/nextjs"

export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4" suppressHydrationWarning>
      <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold text-foreground">DealGuard</span>
      </Link>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Notifications"
          suppressHydrationWarning
        >
          <Bell className="h-5 w-5" />
        </button>
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  )
}

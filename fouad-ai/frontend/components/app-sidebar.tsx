"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutGrid,
  Wallet,
  FileText,
  ShieldAlert,
  Shield,
  Users,
  ChevronDown,
  LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

type NavItem = {
  label: string
  icon: LucideIcon
  href: string
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutGrid, href: "/admin" },
  { label: "Deals", icon: FileText, href: "/admin/deals" },
  { label: "Disputes", icon: ShieldAlert, href: "/admin/disputes" },
  { label: "Evidence Review", icon: Shield, href: "/admin/evidence" },
  { label: "Custody", icon: Wallet, href: "/admin/custody" },
  { label: "KYC Queue", icon: Users, href: "/admin/kyc" },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card py-6" suppressHydrationWarning>
      <nav className="flex flex-1 flex-col gap-1 px-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.children &&
              item.children.some((child) => pathname === child.href))
          const Icon = item.icon
          const hasChildren = item.children && item.children.length > 0

          return (
            <div key={item.label}>
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() =>
                    setOpenSubmenu(
                      openSubmenu === item.label ? null : item.label
                    )
                  }
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  suppressHydrationWarning
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                  <ChevronDown
                    className={cn(
                      "ml-auto h-4 w-4 transition-transform",
                      openSubmenu === item.label && "rotate-180"
                    )}
                  />
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              )}
              {hasChildren && openSubmenu === item.label && (
                <div className="ml-4 mt-1 flex flex-col gap-1">
                  {item.children!.map((child) => (
                    <Link
                      key={child.label}
                      href={child.href}
                      className={cn(
                        "rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                        pathname === child.href
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

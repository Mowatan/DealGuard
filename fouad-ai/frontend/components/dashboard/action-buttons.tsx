"use client"

import { Plus, ArrowDownToLine, ArrowUpFromLine, Store, ShoppingCart } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"

export function ActionButtons() {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="flex items-center gap-3">
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 rounded-xl border border-primary bg-card px-5 py-2.5 text-sm font-medium text-primary hover:bg-accent transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create deal
        </button>
        {dropdownOpen && (
          <div className="absolute left-0 top-full z-10 mt-2 w-48 rounded-xl border border-border bg-card py-2 shadow-lg">
            <Link
              href="/deals/new"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
              onClick={() => setDropdownOpen(false)}
            >
              <Store className="h-4 w-4 text-muted-foreground" />
              New deal
            </Link>
          </div>
        )}
      </div>
      <button
        type="button"
        className="flex items-center gap-2 rounded-xl border border-primary bg-card px-5 py-2.5 text-sm font-medium text-primary hover:bg-accent transition-colors"
      >
        <ArrowDownToLine className="h-4 w-4" />
        Fund wallet
      </button>
      <button
        type="button"
        className="flex items-center gap-2 rounded-xl border border-primary bg-card px-5 py-2.5 text-sm font-medium text-primary hover:bg-accent transition-colors"
      >
        <ArrowUpFromLine className="h-4 w-4" />
        Withdraw
      </button>
    </div>
  )
}

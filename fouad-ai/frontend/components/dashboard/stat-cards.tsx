"use client"

import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"

interface StatCardProps {
  label: string
  value: string
  variant?: "primary" | "default"
  hideable?: boolean
}

function StatCard({ label, value, variant = "default", hideable = false }: StatCardProps) {
  const [hidden, setHidden] = useState(false)

  return (
    <div
      className={
        variant === "primary"
          ? "flex flex-col gap-3 rounded-2xl bg-primary p-6 text-primary-foreground"
          : "flex flex-col gap-3 rounded-2xl bg-muted p-6 text-foreground"
      }
    >
      <div className="flex items-center gap-2">
        <span className={
          variant === "primary"
            ? "text-sm font-medium text-primary-foreground/80"
            : "text-sm font-medium text-muted-foreground"
        }>
          {label}
        </span>
        {hideable && (
          <button
            type="button"
            onClick={() => setHidden(!hidden)}
            className="opacity-60 hover:opacity-100 transition-opacity"
            aria-label={hidden ? "Show balance" : "Hide balance"}
          >
            {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      <span className="text-2xl font-bold">
        {hidden ? "****" : value}
      </span>
    </div>
  )
}

interface Deal {
  status: string
}

interface StatCardsProps {
  deals: Deal[]
}

export function StatCards({ deals }: StatCardsProps) {
  const totalInEscrow = deals.filter(d =>
    ['FUNDED_VERIFIED', 'SIGNED_RECORDED', 'IN_VERIFICATION'].includes(d.status)
  ).length

  const pendingDeals = deals.filter(d =>
    ['DRAFT', 'PROPOSED', 'ACCEPTED_BY_ALL'].includes(d.status)
  ).length

  const completedDeals = deals.filter(d =>
    ['CLOSED', 'RELEASE_CONFIRMED', 'RETURN_CONFIRMED'].includes(d.status)
  ).length

  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard
        label="Total in escrow"
        value={totalInEscrow.toString()}
        variant="primary"
      />
      <StatCard
        label="Completed deals"
        value={completedDeals.toString()}
      />
      <StatCard
        label="Pending deals"
        value={pendingDeals.toString()}
      />
    </div>
  )
}

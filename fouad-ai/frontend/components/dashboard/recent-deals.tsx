"use client"

import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { formatDistance } from 'date-fns'

interface Deal {
  id: string
  title: string
  dealNumber: string
  status: string
  createdAt: string
  _count?: { parties?: number }
}

interface RecentDealsProps {
  deals: Deal[]
}

const statusStyles: Record<string, string> = {
  DRAFT: "bg-amber-100 text-amber-800 border-amber-200",
  PROPOSED: "bg-blue-100 text-blue-800 border-blue-200",
  ACCEPTED_BY_ALL: "bg-blue-100 text-blue-800 border-blue-200",
  FUNDED_VERIFIED: "bg-primary/10 text-primary border-primary/20",
  SIGNED_RECORDED: "bg-primary/10 text-primary border-primary/20",
  IN_VERIFICATION: "bg-primary/10 text-primary border-primary/20",
  CLOSED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  RELEASE_CONFIRMED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  RETURN_CONFIRMED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  DISPUTED: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
}

export function RecentDeals({ deals }: RecentDealsProps) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h3 className="text-base font-semibold text-foreground">Recent deals</h3>
        <Link
          href="/admin/deals"
          className="text-sm font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Deal
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Reference
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Parties
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {deals.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  No deals found
                </td>
              </tr>
            ) : (
              deals.map((deal) => (
                <tr
                  key={deal.id}
                  className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    <Link href={`/admin/deals/${deal.id}`} className="hover:text-primary">
                      {deal.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                    {deal.dealNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {deal._count?.parties || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {formatDistance(new Date(deal.createdAt), new Date(), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="outline"
                      className={statusStyles[deal.status] || "bg-gray-100 text-gray-800 border-gray-200"}
                    >
                      {deal.status.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

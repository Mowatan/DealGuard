"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Order {
  id: string
  title: string
  ref: string
  amount: string
  deliveryDate: string
  deliveryAddress: string
  deliveryNote: string
  status: string
  buyer: { name: string; avatar?: string }
}

const orders: Order[] = [
  {
    id: "ORD354",
    title: "2 Iphone set",
    ref: "RF_ZGHDKYRNF6JDKDVXSKS",
    amount: "E£40,000",
    deliveryDate: "2024-12-10 to 2024-12-16",
    deliveryAddress: "123 Main Street, Springfield",
    deliveryNote: "2 sets of kitchen utensils",
    status: "Pending",
    buyer: { name: "Leslie Alexander" },
  },
  {
    id: "ORD355",
    title: "Kitchen utensils",
    ref: "RF_ZGHDKYRNF6JDKDVXSKS",
    amount: "E£15,000",
    deliveryDate: "2024-12-12 to 2024-12-18",
    deliveryAddress: "456 Oak Avenue, Lagos",
    deliveryNote: "Handle with care",
    status: "Accepted",
    buyer: { name: "John Doe" },
  },
  {
    id: "ORD356",
    title: "Airpods",
    ref: "RF_ZGHDKYRNF6JDKDVXSKS",
    amount: "E£25,000",
    deliveryDate: "2024-12-15 to 2024-12-20",
    deliveryAddress: "789 Pine Road, Abuja",
    deliveryNote: "Original packaging only",
    status: "In progress",
    buyer: { name: "Jane Smith" },
  },
  {
    id: "ORD357",
    title: "Headset",
    ref: "RF_ZGHDKYRNF6JDKDVXSKS",
    amount: "E£8,500",
    deliveryDate: "2024-12-20 to 2024-12-25",
    deliveryAddress: "321 Elm Street, Enugu",
    deliveryNote: "Wireless headset",
    status: "Completed",
    buyer: { name: "Mike Johnson" },
  },
]

const timelineSteps = [
  {
    title: "Order pending (Pending)",
    description: "Order is waiting to be accepted by the buyer",
    active: true,
  },
  {
    title: "Order accepted (Accepted)",
    description: "Order has been accepted by the buyer",
    active: true,
  },
  {
    title: "Payment in escrow (In progress)",
    description: "Buyer has transferred amount to escrow and is awaiting delivery",
    active: false,
  },
  {
    title: "Delivery confirmed (In progress)",
    description: "Delivery has been confirmed by the buyer",
    active: false,
  },
  {
    title: "Product accepted (Completed)",
    description: "Delivery has been accepted by the buyer",
    active: false,
  },
  {
    title: "Release of funds (Completed)",
    description: "Funds has been successfully transferred to your escrow wallet",
    active: false,
  },
]

function OrderTimeline() {
  return (
    <div className="space-y-0">
      <h4 className="mb-6 text-base font-semibold text-foreground">Order timeline</h4>
      <div className="relative">
        {timelineSteps.map((step, i) => (
          <div key={step.title} className="relative flex gap-4 pb-8 last:pb-0">
            {/* Connector line */}
            {i < timelineSteps.length - 1 && (
              <div
                className={cn(
                  "absolute left-[9px] top-6 h-full w-0.5",
                  step.active ? "bg-primary" : "bg-border"
                )}
              />
            )}
            {/* Dot */}
            <div className="relative z-10 flex-shrink-0">
              <div
                className={cn(
                  "h-5 w-5 rounded-full border-2",
                  step.active
                    ? "border-primary bg-card"
                    : "border-border bg-card"
                )}
              >
                {step.active && (
                  <div className="absolute inset-1.5 rounded-full bg-primary" />
                )}
              </div>
            </div>
            {/* Content */}
            <div className="space-y-1 pt-0.5">
              <p className={cn(
                "text-sm font-medium",
                step.active ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.title}
              </p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function OrderLibrary() {
  const [selectedId, setSelectedId] = useState(orders[0].id)
  const [searchQuery, setSearchQuery] = useState("")
  const selected = orders.find((o) => o.id === selectedId) || orders[0]

  const handleCancelOrder = () => {
    console.log("[v0] Cancel order clicked for:", selected.id)
    // TODO: Implement cancel order logic
  }

  const handleRaiseDispute = () => {
    console.log("[v0] Raise dispute clicked for:", selected.id)
    // TODO: Implement raise dispute logic
  }

  const filtered = orders.filter(
    (o) =>
      o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.ref.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Order library</h1>
      <div className="flex gap-0 rounded-2xl border border-border bg-card overflow-hidden" style={{ minHeight: "70vh" }}>
        {/* Left panel - Order list */}
        <div className="w-80 shrink-0 border-r border-border">
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>
          <div className="p-4 space-y-1">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Ongoing orders</h3>
            {filtered.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedId(order.id)}
                className={cn(
                  "flex w-full flex-col gap-1 rounded-xl px-4 py-3 text-left transition-colors",
                  selectedId === order.id
                    ? "bg-warning text-warning-foreground"
                    : "text-foreground hover:bg-muted"
                )}
                suppressHydrationWarning
              >
                <span className={cn(
                  "text-sm font-medium",
                  selectedId === order.id ? "text-warning-foreground" : "text-foreground"
                )}>
                  {order.title}
                </span>
                <span className={cn(
                  "text-xs font-mono",
                  selectedId === order.id ? "text-warning-foreground/80" : "text-muted-foreground"
                )}>
                  {order.ref}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right panel - Order details */}
        <div className="flex-1 overflow-y-auto">
          {/* Buyer info */}
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <Avatar className="h-9 w-9">
              <AvatarImage src={selected.buyer.avatar || "/placeholder.svg"} alt={selected.buyer.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {selected.buyer.name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">{selected.buyer.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{selected.ref}</p>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Order info */}
            <div>
              <p className="text-lg font-semibold text-foreground">{selected.id}</p>
              <p className="text-sm text-muted-foreground">Order details</p>
            </div>

            <div className="space-y-0">
              <div className="border-t border-border" />
              {[
                { label: "Order reference", value: `REF _${selected.ref}` },
                { label: "Amount", value: selected.amount },
                { label: "Delivery date", value: selected.deliveryDate },
                { label: "Delivery address", value: selected.deliveryAddress },
                { label: "Delivery note", value: selected.deliveryNote },
                { label: "Status", value: selected.status },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between border-b border-border py-4"
                >
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="text-sm font-medium text-foreground">{row.value}</span>
                </div>
              ))}
            </div>

            <OrderTimeline />

            <div className="flex items-center gap-4 pt-4">
              <button
                type="button"
                onClick={handleCancelOrder}
                className="rounded-xl bg-destructive px-6 py-3 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
                suppressHydrationWarning
              >
                <span>Cancel order</span>
              </button>
              <button
                type="button"
                onClick={handleRaiseDispute}
                className="ml-auto rounded-xl border border-primary bg-card px-6 py-3 text-sm font-medium text-primary hover:bg-accent transition-colors"
                suppressHydrationWarning
              >
                <span>Raise a dispute</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

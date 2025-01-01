"use client"

import { Button } from './Button'
import { Input } from './input'
import { Search, HelpCircle, Bell } from 'lucide-react'
import { Breadcrumb } from "@/components/ui/breadcrumb"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1C1C1F] bg-[#0A0A0B] px-10 py-4 flex items-center justify-between">
      <Breadcrumb 
        items={[
          { label: "alphabin", href: "/dashboard" },
          "All projects"
        ]} 
      />
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="border-[#1C1C1F] hover:bg-[#1C1C1F] text-[#E6E6E6]">
          <HelpCircle className="h-4 w-4" />
          Help
        </Button>
        <Button variant="outline" size="sm" className="border-[#1C1C1F] hover:bg-[#1C1C1F] text-[#E6E6E6]">
          <Bell className="h-4 w-4" />
          Notifications
        </Button>
      </div>
    </header>
  )
}

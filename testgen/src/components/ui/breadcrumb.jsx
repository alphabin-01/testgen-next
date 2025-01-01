"use client"

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

export function Breadcrumb({ items }) {
  return (
    <div className="flex items-center gap-2 text-sm text-[#777777]">
      {items.map((item, index) => {
        const isLink = typeof item === 'object' && item.href;
        const content = isLink ? item.label : item;
        
        return (
          <div key={index} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
            {isLink ? (
              <Link 
                href={item.href}
                className={`hover:text-white transition-colors ${
                  index === items.length - 1 ? "text-white" : ""
                }`}
              >
                {content}
              </Link>
            ) : (
              <span className={index === items.length - 1 ? "text-white" : ""}>
                {content}
              </span>
            )}
          </div>
        );
      })}
    </div>
  )
}

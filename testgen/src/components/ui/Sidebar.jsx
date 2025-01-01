import Link from 'next/link'
import { Home, Settings, FileText, Key, LogOut, HelpCircle } from 'lucide-react'

export function Sidebar() {
  return (
    <div className="fixed left-0 top-0 h-screen w-60 bg-[#0A0A0B] border-r border-[#1C1C1F]">
      <div className="flex flex-col h-full">
        <div className="p-4">
          <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        </div>
        
        <div className="flex-1 px-4">
          <div className="mb-8">
            <h2 className="text-sm font-medium text-[#666666] mb-2">Projects</h2>
            <Link 
              href="/projects"
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#E6E6E6] hover:bg-[#1C1C1F] rounded-md transition-colors"
            >
              <Home size={16} />
              All projects
            </Link>
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-medium text-[#666666] mb-2">Organisation</h2>
            <div className="px-3 py-2 text-sm text-[#E6E6E6]">
              testgen@example.com
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-medium text-[#666666] mb-2">Account</h2>
            <div className="space-y-1">
              <Link 
                href="/settings"
                className="flex items-center gap-2 px-3 py-2 text-sm text-[#E6E6E6] hover:bg-[#1C1C1F] rounded-md transition-colors"
              >
                <Settings size={16} />
                Preferences
              </Link>
              <Link 
                href="/tokens"
                className="flex items-center gap-2 px-3 py-2 text-sm text-[#E6E6E6] hover:bg-[#1C1C1F] rounded-md transition-colors"
              >
                <Key size={16} />
                Access Tokens
              </Link>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-medium text-[#666666] mb-2">Documentation</h2>
            <div className="space-y-1">
              <Link 
                href="/guides"
                className="flex items-center gap-2 px-3 py-2 text-sm text-[#E6E6E6] hover:bg-[#1C1C1F] rounded-md transition-colors"
              >
                <FileText size={16} />
                Guides
              </Link>
              <Link 
                href="/api"
                className="flex items-center gap-2 px-3 py-2 text-sm text-[#E6E6E6] hover:bg-[#1C1C1F] rounded-md transition-colors"
              >
                <HelpCircle size={16} />
                API Reference
              </Link>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#1C1C1F]">
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-[#666666] hover:bg-[#1C1C1F] rounded-md transition-colors w-full">
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}

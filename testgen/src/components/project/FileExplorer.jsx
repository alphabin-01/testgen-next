"use client"

import { useState } from "react"
import {
  ChevronRight,
  Folder,
  MoreVertical,
  Plus,
  Search,
} from "lucide-react"
// import { getFileIcon } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu"

export function FileExplorer({ files, getFileIcon, onFileSelect, openTabs }) {
  const [openFolders, setOpenFolders] = useState(new Set());



  function FileItem({ item, level = 0 }) {
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openFolders.has(item.name);

    const toggleFolder = (e) => {
      e.stopPropagation();
      setOpenFolders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(item.name)) {
          newSet.delete(item.name);
        } else {
          newSet.add(item.name);
        }
        return newSet;
      });
    };



    const handleClick = (e) => {
      e.stopPropagation();
      if (hasChildren) {
        toggleFolder(e);
      } else {
        onFileSelect(item);
      }
    };

    return (
      <div>
        <div
          className={`flex items-center justify-between gap-1 ${!hasChildren ? 'ml-3' : ''} pr-2 cursor-pointer text-sm hover:bg-[#1C1C1F] rounded-sm group
            ${level > 0 ? 'ml-1' : ''}`}
          onClick={handleClick}
        >
          <div className={`flex items-center gap-1 justify-between pl-1 ${!hasChildren ? 'pl-3' : ''}`}>

            {hasChildren ? (
              <div className="flex items-center gap-1 text-[#777777]">
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                />
                <Folder className={`h-4 w-4 ${isOpen ? 'text-blue-400' : ''}`} />
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {fileImage(item)}
              </div>
            )}
            <span className="text-[#E6E6E6] truncate">{item.name}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 text-[#777777] opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32 bg-[#0A0A0B] border-[#1C1C1F]">
              <DropdownMenuItem onClick={() => {}}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => {}}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {hasChildren && isOpen && (
          <div className="ml-2 border-l border-[#1C1C1F]">
            {item.children.map((child) => (
              <FileItem
                key={child.path || child.name}
                item={child}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );

    function fileImage(item) {
      const extension = item.name.match(/\.[^.]+$|\.spec\.(js|ts)$|\.config\.(js|ts)$/)?.[0]
      return getFileIcon(extension)
    }
  }

  return (
    <div className="flex flex-col bg-[#0A0A0B] p-3">
      <div className="p-2 flex gap-2 items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          className="bg-transparent border-[#1C1C1F] hover:bg-[#1C1C1F] text-[#E6E6E6] gap-2"
        >
          <Plus className="h-4 w-4" />
          Create new file
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="bg-transparent border-[#1C1C1F] hover:bg-[#1C1C1F] text-[#E6E6E6]"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#E6E6E6] font-medium">Explorer</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-[#1C1C1F] scrollbar-track-transparent">
        <div className="mt-2">
          {files.map((item) => (
            <FileItem
              key={item.path || item.name}
              item={item}
              level={0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

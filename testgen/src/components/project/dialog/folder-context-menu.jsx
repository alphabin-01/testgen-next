"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Upload, Trash2, MoreVertical, FolderPlus, Edit } from "lucide-react"

export function FolderContextMenu({ children, onUpload, onDelete, onRename, onNewFolder }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 bg-[#0A0A0B] border-[#1C1C1F]">
        <DropdownMenuItem 
          className="text-[#E6E6E6] focus:bg-[#1C1C1F] focus:text-[#E6E6E6] gap-2"
          onClick={onRename}
        >
          <Edit className="h-4 w-4" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="text-[#E6E6E6] focus:bg-[#1C1C1F] focus:text-[#E6E6E6] gap-2"
          onClick={onNewFolder}
        >
          <FolderPlus className="h-4 w-4" />
          New Folder
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="text-[#E6E6E6] focus:bg-[#1C1C1F] focus:text-[#E6E6E6] gap-2"
          onClick={onUpload}
        >
          <Upload className="h-4 w-4" />
          Upload File
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#1C1C1F]" />
        <DropdownMenuItem 
          className="text-red-500 focus:bg-[#1C1C1F] focus:text-red-500 gap-2"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

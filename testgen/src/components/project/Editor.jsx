"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { MonacoEditor } from "./MonacoEditor"
import { FileExplorer } from "./FileExplorer"
import { Button } from "@/components/ui/button"
import { Play, Download, Video, X, Plus, Home, MoreVertical } from "lucide-react"
import Image from "next/image"
import { getLanguageByExtension } from "@/lib/utils"
import { Icon } from "@iconify/react"
import DownloadIcon from "@/assets/download.svg"
import AbLogo from "@/assets/ab_logo.svg"
import playwright from "@/assets/playwright_logo.svg"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu"
import { SettingsDialog } from "./dialog/setting-dialog"


// ... (rest of the code remains the same)

const getFileIcon = (type) => {
  switch (type) {
    case '.html':
      return <Icon icon="devicon:html5" height={18} width={18} />;
    case '.js':
      return <Icon icon="logos:javascript" height={18} width={18} />;
    case '.ts':
      return <Icon icon="logos:typescript-icon" height={18} width={18} />;
    case '.env':
      return <Icon icon="uil:setting" height={18} width={18} />;
    case '.json':
      return <Icon icon="vscode-icons:file-type-json" height={18} width={18} />;
    case '.last-run.json':
      return <Icon icon="vscode-icons:file-type-json" height={18} width={18} />;
    case '.spec.js':
      return <Icon icon="grommet-icons:test" style="color: #f0dc00" height={18} width={18} />;
    case '.config.js':
      return <Icon icon="logos:playwright" height={18} width={18} />;
    case '.config.ts':
      return <Icon icon="logos:playwright" style={'color: #486dfe'} height={18} width={18} />;
    case '.spec.ts':
      return <Icon icon="grommet-icons:test" style="color: #486dfe" height={18} width={18} />;
    case '.md':
      return <Icon icon="ion:information-circle-outline" height={18} width={18} style={{ color: "#486dfe" }} />;
    default:
      return <Icon icon="flowbite:file-code-outline" color="lightblue" height={18} width={18} />;
  }
};

const mockFiles = [
  {
    name: "src",
    type: "directory",
    children: [
      {
        name: "components",
        type: "directory",
        children: [

          {
            name: "Button.jsx",
            type: "file",
            content: "// Button component code",
            path: "/src/components/Button.jsx"
          },
          {
            name: "Input.jsx",
            type: "file",
            content: "// Input component code",
            path: "/src/components/Input.jsx"
          },
        ],
      },
      {
        name: "App.jsx",
        type: "file",
        content: "// App component code",
        path: "/src/App.jsx"
      },
      {
        name: "pages",
        type: "directory",
        children: [

          {
            name: "index.js",
            type: "file",
            content: "// Home page code",
            path: "/src/pages/index.js"
          },
          {
            name: "about.js",
            type: "file",
            content: "// About page code",
            path: "/src/pages/about.js"
          },
        ],
      },
      {
        name: "styles.css",
        type: "file",
        content: "/* CSS styles */",
        path: "/src/styles.css"
      },
    ],
  },
  {
    name: "public",
    type: "directory",
    children: [
      {
        name: "favicon.ico",
        type: "file",
        content: "// Favicon content",
        path: "/public/favicon.ico"
      },

      {
        name: "logo.png",
        type: "file",
        content: "// Logo content",
        path: "/public/logo.png"
      },

      {
        name: "manifest.json",
        type: "file",
        content: "// Manifest content",
        path: "/public/manifest.json"
      },
      {
        name: "robots.txt",
        type: "file",
        content: "// Robots content",
        path: "/public/robots.txt"
      },
    ],
  },
  {
    name: "package.json",
    type: "file",
    content: "// Package config",
    path: "/package.json"
  },
]

const findFileByPath = (files, path) =>
  files.reduce((found, file) => {
    if (found) return found;
    if (file.path === path) return file;
    return file.children ? findFileByPath(file.children, path) : null;
  }, null);

const updateFileContent = (files, path, newContent) =>
  files.map((file) =>
    file.path === path
      ? { ...file, content: newContent }
      : file.children
        ? { ...file, children: updateFileContent(file.children, path, newContent) }
        : file
  );

export function Editor() {
  const [files, setFiles] = useState(mockFiles)
  const [openTabs, setOpenTabs] = useState([])
  const [activeTab, setActiveTab] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [editorContent, setEditorContent] = useState("")
  const [sidebarWidth, setSidebarWidth] = useState(256)
  const [isResizing, setIsResizing] = useState(false)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const lastScrollTop = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const st = window.pageYOffset || document.documentElement.scrollTop
      if (st > lastScrollTop.current) {
        // Scrolling down
        setIsHeaderVisible(false)
      } else {
        // Scrolling up
        setIsHeaderVisible(true)
      }
      lastScrollTop.current = st <= 0 ? 0 : st
    }

    const container = document.querySelector('.editor-container')
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true })
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const startResizing = useCallback((e) => {
    e.preventDefault()
    setIsResizing(true)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', stopResizing)
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', stopResizing)
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (isResizing) {
      const newWidth = e.clientX
      const screenWidth = window.innerWidth
      const minWidth = 150
      const maxWidth = screenWidth - 200
      const newWidths = Math.min(Math.max(newWidth, minWidth), maxWidth)
      setSidebarWidth(newWidths)
    }
  }, [isResizing])

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', stopResizing)
    }
  }, [handleMouseMove, stopResizing])

  const handleFileSelect = (file) => {
    if (file.type === "file") {
      if (!openTabs.some((tab) => tab.path === file.path)) {
        setOpenTabs([...openTabs, file]);
      }
      setActiveTab(file);
      setSelectedFile(file);
      setEditorContent(file.content); // Update editor content
    }
  };

  const closeTab = (tab, e) => {
    e.stopPropagation();
    const newTabs = openTabs.filter((t) => t.path !== tab.path);
    setOpenTabs(newTabs);

    if (activeTab?.path === tab.path) {
      const lastTab = newTabs[newTabs.length - 1] || null;
      setActiveTab(lastTab);
      setSelectedFile(lastTab);
      setEditorContent(lastTab?.content || ""); // Update editor content
    }
  };

  const handleFileChange = (file, newContent) => {
    const updatedFiles = updateFileContent(files, file.path, newContent);
    setFiles(updatedFiles);

    setOpenTabs((tabs) =>
      tabs.map((tab) => (tab.path === file.path ? { ...tab, content: newContent } : tab))
    );

    if (activeTab?.path === file.path) {
      setActiveTab({ ...file, content: newContent });
      setSelectedFile({ ...file, content: newContent });
      setEditorContent(newContent);
    }
  };

  const getTabIcon = (fileName) => {
    const extension = fileName.match(/\.[^.]+$|\.spec\.(js|ts)$|\.config\.(js|ts)$/)?.[0]
    return extension ? getFileIcon(extension) : null
  }

  return (
    <div className="flex h-screen">
      {/* Left Side - File Explorer */}
      <div
        style={{ width: `${sidebarWidth}px` }}
        className="flex-shrink-0 bg-[#0A0A0B] border-r border-[#1C1C1F] flex flex-col"
      >
        <div className={`h-16 flex items-center justify-between px-3 border-b border-[#1C1C1F] transition-all duration-300 ease-in-out transform ${isHeaderVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}>
          <Image src={AbLogo} alt="AB Logo" className="h-7 w-7" />
          <Button variant="outline" size="sm" className="border-[#1C1C1F] hover:bg-[#1C1C1F] bg-[] text-[#E6E6E6]">
            <Image src={playwright} alt="Playwright Icon" className="h-5 w-5" />
            Playwright
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-[#1C1C1F] hover:bg-[#1C1C1F] text-[#E6E6E6]"
              >
                <Icon icon="material-symbols:home-rounded" height={18} width={18} />
                <Icon icon="icon-park-outline:down" height={18} width={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32 bg-[#0A0A0B] border-[#1C1C1F]">
              <DropdownMenuItem onClick={() => { }}>Invite</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { }}>Notifications</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>Settings</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <FileExplorer
          files={files}
          getFileIcon={getFileIcon}
          onFileSelect={handleFileSelect}
          openTabs={openTabs}
        />
      </div>

      {/* Resize Handle */}
      <div
        className="w-1 cursor-col-resize bg-transparent hover:bg-[#1C1C1F] transition-colors"
        onMouseDown={startResizing}
      />

      {/* Right Side - Editor and Tabs */}
      <div className="flex-1 flex flex-col editor-container overflow-auto">
        {/* Header with Tabs and Buttons */}
        <div className={`h-12 bg-[#0A0A0B] border-b border-[#1C1C1F] flex items-center justify-between pr-2 sticky top-0 transition-all duration-300 ease-in-out transform ${isHeaderVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}>
          {/* Tabs Section */}
          <div className="flex-1 flex items-center h-full overflow-x-auto scrollbar-thin scrollbar-thumb-[#666666] scrollbar-track-transparent hover:scrollbar-thumb-[#777777]">
            {openTabs.map((tab) => (
              <div
                key={tab.path}
                className={`group flex items-center h-full px-3 gap-2 text-sm cursor-pointer border-r border-[#1C1C1F]
                    ${activeTab?.path === tab.path
                    ? "bg-[#1E1E1E] text-[#E6E6E6]"
                    : "text-[#777777] hover:bg-[#1C1C1F] hover:text-[#E6E6E6]"
                  }`}
                onClick={() => {
                  setActiveTab(tab)
                  setSelectedFile(tab)
                  setEditorContent(tab.content)
                }}
              >
                {getTabIcon(tab.name)}
                <span className="max-w-[120px] truncate">{tab.name}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 hover:text-[#E6E6E6]"
                  onClick={(e) => closeTab(tab, e)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>


          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="border-[#1C1C1F] hover:bg-[#1C1C1F] text-[#E6E6E6]">
              <Icon icon="fluent:play-12-filled" className="h-3.5 w-3.5" />
              Run
            </Button>
            <Button variant="outline" size="sm" className="border-[#1C1C1F] hover:bg-[#1C1C1F] text-[#E6E6E6]">
              <Icon icon="carbon:stop-filled" className="h-3.5 w-3.5" />
              Record
            </Button>
            <Button variant="outline" size="sm" className="border-[#1C1C1F] hover:bg-[#1C1C1F] text-[#E6E6E6]">
              <Image src={DownloadIcon} alt="Download" className="h-3.5 w-3.5" />
              Download
            </Button>
          </div>
        </div>

        {/* Tabs and Editor Area */}
        <div className="flex-1 flex flex-col">

          {/* Editor */}
          <div className="flex-1 bg-[#0A0A0B]">
            {selectedFile ? (
              <MonacoEditor
                value={editorContent}
                onChange={(value) => handleFileChange(selectedFile, value)}
                language={getLanguageByExtension(selectedFile.name.match(/\.[^.]+$|\.spec\.(js|ts)$|\.config\.(js|ts)$/)?.[0])}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-[#777777]">
                Select a file to edit
              </div>
            )}
          </div>
        </div>
      </div>
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

    </div>
  );
}

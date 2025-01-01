"use client"

import { useState } from "react"
import { MonacoEditor } from "./MonacoEditor"
import { FileExplorer } from "./FileExplorer"
import { Button } from "@/components/ui/button"
import { Play, Download, Video, X, Plus, Home } from "lucide-react"
import Image from "next/image"
import { getLanguageByExtension } from "@/lib/utils"
import { Icon } from "@iconify/react"

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
    ],
  },
  { 
    name: "package.json", 
    type: "file", 
    content: "// Package config",
    path: "/package.json"
  },
  { 
    name: "README.md", 
    type: "file", 
    content: "# Project Documentation",
    path: "/README.md"
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
    <div className="flex flex-col h-screen">

      {/* Tabs */}
      {openTabs.length > 0 && (
        <div className="overflow-y-hidden h-8 p-6 bg-[#0A0A0B] border-b border-[#1C1C1F] flex items-center px-1 gap-1 overflow-x-auto scrollbar scrollbar-thumb-[#1C1C1F]  scrollbar-track-[#0A0A0B]">
          {openTabs.map((tab) => (
            <div
              key={tab.path}
              className={`group flex items-center h-9 px-3 gap-2 text-sm cursor-pointer rounded-sm
                ${activeTab?.path === tab.path
                  ? "bg-[#1C1C1F] text-[#E6E6E6]"
                  : "text-[#777777] hover:bg-[#1C1C1F] hover:text-[#E6E6E6]"}`}
              onClick={() => {
                setActiveTab(tab)
                setSelectedFile(tab)
                setEditorContent(tab.content)
              }}
            >
              {getTabIcon(tab.name)}
              <span>{tab.name}</span>
              <button
                className="opacity-0 group-hover:opacity-100 hover:text-[#E6E6E6]"
                onClick={(e) => closeTab(tab, e)}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Top Bar */}
      <div className="h-12 bg-[#0A0A0B] border-b border-[#1C1C1F] flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[#1C1C1F] rounded px-2 py-1">
            <Image
              src="/playwright.svg"
              alt="Playwright"
              width={16}
              height={16}
              className="rounded"
            />
            <span className="text-xs text-[#E6E6E6]">Playwright</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-[#E6E6E6] hover:bg-[#1C1C1F]"
          >
            Menu
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="border-[#1C1C1F] hover:bg-[#1C1C1F] text-[#E6E6E6]">
            <Play className="h-3.5 w-3.5" />
            Run
          </Button>
          <Button variant="outline" size="sm" className="border-[#1C1C1F] hover:bg-[#1C1C1F] text-[#E6E6E6]">
            <Video className="h-3.5 w-3.5" />
            Record
          </Button>
          <Button variant="outline" size="sm" className="border-[#1C1C1F] hover:bg-[#1C1C1F] text-[#E6E6E6]">
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
        </div>
      </div>


      {/* Content */}
      <div className="flex flex-1 min-h-0">
        {/* File Explorer */}
        <div className="w-64 border-r border-[#1C1C1F]">
          <FileExplorer
            files={files}
            getFileIcon={getFileIcon}
            onFileSelect={handleFileSelect}
            openTabs={openTabs}
          />
        </div>

        {/* Editor */}
        <div className="flex-1">
          {selectedFile ? (
            <MonacoEditor
              value={editorContent}
              onChange={(value) => handleFileChange(selectedFile, value)}
              language={getLanguageByExtension(selectedFile.name.match(/\.[^.]+$|\.spec\.(js|ts)$|\.config\.(js|ts)$/)?.[0])}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-[#777777] text-sm">
              Select a file to edit
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

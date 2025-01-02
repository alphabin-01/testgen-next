"use client"

import Editor, { useMonaco } from "@monaco-editor/react"
import { useTheme } from "next-themes"
import { useEffect } from "react"

export function MonacoEditor({ value, onChange, language = "javascript" }) {
  const { theme } = useTheme()
  const monaco = useMonaco()

  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme("optimizedTheme", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "comment", foreground: "6A9955" },
          { token: "keyword", foreground: "569CD6" },
          { token: "string", foreground: "CE9178" },
          { token: "number", foreground: "B5CEA8" },
          { token: "type", foreground: "4EC9B0" },
        ],
        colors: {
          "editor.background": "#1E1E1E",
          "editor.foreground": "#D4D4D4",
          "editorLineNumber.foreground": "#858585",
          "editor.selectionBackground": "#264F78",
          "editor.inactiveSelectionBackground": "#3A3D41",
        },
      });
      monaco.editor.setTheme("optimizedTheme");
    }
  }, [monaco]);

  return (
    <Editor
      height="100%"
      language={language}
      value={value} // Use value prop for controlled updates
      onChange={onChange} // Update content when the user makes changes
      options={{
        lineNumbers: "on",
        wordWrap: "on",
        formatOnType: true,
        formatOnPaste: true,
        automaticLayout: true,
        fontSize: 13,
        foldingStrategy: "indentation",
        foldingImportsByDefault: true,
        folding: true,
        minimap: { enabled: true },
        fontFamily: "'Fira Code', 'Droid Sans Mono', 'monospace', monospace",
        fontLigatures: true,
        cursorBlinking: "smooth",
        cursorStyle: "line",
        smoothScrolling: true,
        mouseWheelZoom: true,
        scrollBeyondLastLine: false,
        scrollbar: {
          vertical: "visible",
          horizontal: "visible",
          useShadows: true,
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
        fixedOverflowWidgets: true,
        quickSuggestions: { other: true, comments: false, strings: false },
        quickSuggestionsDelay: 10,
        autoClosingBrackets: "always",
        autoClosingQuotes: "always",
        autoClosingOvertype: "always",
        autoIndent: "full",
        autoSurround: "languageDefined",
        bracketPairColorization: { enabled: true },
        matchBrackets: "always",
        copyWithSyntaxHighlighting: true,
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: "smart",
        snippetSuggestions: "inline",
        tabSize: 2,
        insertSpaces: true,
        find: {
          addExtraSpaceOnTop: false,
          autoFindInSelection: "always",
          seedSearchStringFromSelection: "always",
        },
        parameterHints: { enabled: true, cycle: true },
        hover: { enabled: true, delay: 300 },
        emptySelectionClipboard: false,
        renderControlCharacters: true,
        renderLineHighlight: "all",
        renderWhitespace: "selection",
      }}
      className="border border-[#1C1C1F]   overflow-hidden"
    />
  )
}

import { useCallback } from "react";
import Editor from "@monaco-editor/react";
import { setupOpenCalcMonaco } from "../../utils/monacoThemes.js";
import type { BackendFile, UiTheme } from "./types";

interface IdePanelProps {
  files: BackendFile[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onAddFile: () => void;
  onChangeCode: (id: string, code: string) => void;
  ui: UiTheme;
  accentHex: string;
  monacoTheme: string;
}

export default function IdePanel({
  files,
  activeFileId,
  onSelectFile,
  onAddFile,
  onChangeCode,
  ui,
  accentHex,
  monacoTheme,
}: IdePanelProps) {
  const activeFile = files.find((f) => f.id === activeFileId) ?? files[0];
  // Keep runnable code current: Send and file switching must never race a timer.
  const handleChange = useCallback(
    (value: string | undefined) => {
      if (activeFile) onChangeCode(activeFile.id, value ?? "");
    },
    [activeFile?.id, onChangeCode]
  );

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className={`flex items-center border-b ${ui.border} ${ui.bg1} overflow-x-auto shrink-0`}>
        {files.map((file) => (
          <button
            key={file.id}
            onClick={() => onSelectFile(file.id)}
            className={`px-3.5 py-2 text-[13px] font-mono whitespace-nowrap border-b-2 transition-colors ${
              file.id === activeFileId ? `${ui.bg0} ${ui.txt1}` : `${ui.txt2} ${ui.hoverBg} ${ui.hoverTx}`
            }`}
            style={{ borderBottomColor: file.id === activeFileId ? accentHex : "transparent" }}
          >
            {file.name}
          </button>
        ))}
        <button
          onClick={onAddFile}
          title="Add a file"
          className={`px-3 py-2 text-[13px] ${ui.txt2} ${ui.hoverTx} transition-colors`}
        >
          + New
        </button>
      </div>
      <div className="flex-1 min-h-0">
        {activeFile && (
          <Editor
            height="100%"
            path={`file:///backend-lab/${activeFile.id}/${activeFile.name}`}
            defaultLanguage="javascript"
            language="javascript"
            value={activeFile.code}
            theme={monacoTheme}
            beforeMount={setupOpenCalcMonaco}
            onChange={handleChange}
            options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true }}
          />
        )}
      </div>
    </div>
  );
}

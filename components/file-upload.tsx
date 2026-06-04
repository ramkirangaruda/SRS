// Reusable drag-and-drop file uploader. Validates on the CLIENT (size/type/count)
// for instant feedback, uploads each file immediately via /api/upload with a
// progress bar, and reports the resulting StoredFile[] to the parent via onChange.
// Falls back to a normal file-picker button (tapping the zone) on touch devices.
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { UploadCloud, File as FileIcon, X, Loader2 } from "lucide-react";
import { uploadWithProgress } from "@/lib/xhr-upload";
import { MAX_FILES, MAX_FILE_SIZE, validateFileMeta, formatBytes, type StoredFile } from "@/lib/upload-constants";
import { cn } from "@/lib/utils";

type Item = {
  key: string;
  name: string;
  size: number;
  status: "uploading" | "done" | "error";
  progress: number;
  stored?: StoredFile;
  error?: string;
};

let counter = 0;
const nextKey = () => `f${Date.now()}-${counter++}`;

export function FileUpload({
  value,
  onChange,
  folder = "homework-attachments",
  maxFiles = MAX_FILES,
}: {
  value: StoredFile[];
  onChange: (files: StoredFile[]) => void;
  folder?: string;
  maxFiles?: number;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  // Local list (seeded from existing attachments for the edit case).
  const [items, setItems] = useState<Item[]>(() =>
    value.map((v) => ({ key: nextKey(), name: v.name, size: v.size, status: "done", progress: 100, stored: v }))
  );

  // Whenever the set of successfully-uploaded files changes, tell the parent.
  useEffect(() => {
    onChange(items.filter((i) => i.status === "done" && i.stored).map((i) => i.stored!));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    const room = maxFiles - items.length;
    const accepted = incoming.slice(0, Math.max(0, room));

    for (const file of accepted) {
      const err = validateFileMeta({ name: file.name, size: file.size, type: file.type });
      const key = nextKey();
      if (err) {
        setItems((prev) => [...prev, { key, name: file.name, size: file.size, status: "error", progress: 0, error: err }]);
        continue;
      }
      // Add an uploading row, then drive its progress.
      setItems((prev) => [...prev, { key, name: file.name, size: file.size, status: "uploading", progress: 0 }]);
      uploadWithProgress(file, folder, (pct) =>
        setItems((prev) => prev.map((it) => (it.key === key ? { ...it, progress: pct } : it)))
      )
        .then((stored) =>
          setItems((prev) => prev.map((it) => (it.key === key ? { ...it, status: "done", progress: 100, stored } : it)))
        )
        .catch((e) =>
          setItems((prev) =>
            prev.map((it) => (it.key === key ? { ...it, status: "error", error: e.message } : it))
          )
        );
    }
  }

  function removeItem(key: string) {
    // Note: a file that was uploaded then removed before saving becomes an
    // "orphan" in storage. The edit API cleans up files removed from SAVED
    // homework; a periodic sweep would catch the rest.
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  const full = items.length >= maxFiles;

  return (
    <div className="space-y-2">
      {/* Drop zone (also a big tap target / picker trigger on mobile) */}
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-6 text-center transition-colors",
          dragOver ? "border-primary bg-accent" : "border-input hover:bg-accent/50",
          full && "pointer-events-none opacity-50"
        )}
      >
        <UploadCloud className="mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">Tap to choose files, or drag & drop</p>
        <p className="text-xs text-muted-foreground">
          Up to {maxFiles} files, {MAX_FILE_SIZE / 1024 / 1024} MB each
        </p>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = ""; // allow re-selecting the same file
          }}
        />
      </label>

      {/* Selected / uploaded files */}
      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((it) => (
            <li key={it.key} className="flex items-center gap-3 rounded-md border p-2 text-sm">
              {it.status === "uploading" ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate">{it.name}</p>
                {it.status === "uploading" && (
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${it.progress}%` }} />
                  </div>
                )}
                {it.status === "error" ? (
                  <p className="text-xs text-destructive">{it.error}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">{formatBytes(it.size)}</p>
                )}
              </div>
              <button type="button" onClick={() => removeItem(it.key)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

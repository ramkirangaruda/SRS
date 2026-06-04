// Client helper: upload one file with PROGRESS. We use XMLHttpRequest instead of
// fetch() because fetch can't report upload progress, but XHR exposes
// upload.onprogress (bytes sent so far) — which is how the FileUpload component
// shows a progress bar per file.
import type { StoredFile } from "@/lib/upload-constants";

export function uploadWithProgress(
  file: File,
  folder: string,
  onProgress: (percent: number) => void
): Promise<StoredFile> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    // Fires repeatedly as bytes leave the browser.
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(json as StoredFile);
        else reject(new Error(json.error ?? "Upload failed"));
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));

    xhr.send(form);
  });
}

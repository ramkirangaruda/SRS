// Renders homework attachments as downloadable cards with a type-appropriate
// icon (image thumbnail, PDF, doc, sheet, slide, or generic). Plain component —
// works in Server and Client. The href points straight at the stored file URL
// (in dev, a /public path; in prod, this would be a presigned storage URL).
import { FileText, Image as ImageIcon, FileSpreadsheet, Presentation, File as FileIcon } from "lucide-react";
import type { StoredFile } from "@/lib/upload-constants";
import { fileKind, formatBytes } from "@/lib/upload-constants";

function KindIcon({ name, type }: { name: string; type: string }) {
  const kind = fileKind(type || name);
  const cls = "h-5 w-5";
  if (kind === "pdf") return <FileText className={`${cls} text-red-600`} />;
  if (kind === "doc") return <FileText className={`${cls} text-blue-600`} />;
  if (kind === "sheet") return <FileSpreadsheet className={`${cls} text-green-600`} />;
  if (kind === "slide") return <Presentation className={`${cls} text-orange-600`} />;
  if (kind === "image") return <ImageIcon className={`${cls} text-purple-600`} />;
  return <FileIcon className={`${cls} text-muted-foreground`} />;
}

export function AttachmentList({ attachments }: { attachments: StoredFile[] }) {
  if (attachments.length === 0) {
    return <p className="text-sm text-muted-foreground">No attachments.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {attachments.map((f) => {
        const isImage = fileKind(f.type || f.name) === "image";
        return (
          <a
            key={f.url}
            href={f.url}
            target="_blank"
            rel="noopener noreferrer"
            download={f.name}
            className="flex items-center gap-3 rounded-md border p-2 transition-colors hover:bg-accent"
          >
            {isImage ? (
              // Image attachments show a small thumbnail.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.url} alt={f.name} className="h-10 w-10 rounded object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                <KindIcon name={f.name} type={f.type} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{f.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(f.size)}</p>
            </div>
          </a>
        );
      })}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";

export default function UploadForm({
  workspaceId,
  onUploaded
}: {
  workspaceId: string;
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setMessage(null);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspaceId", workspaceId);

      const res = await fetch("/api/documents/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setMessage(`Failed: ${file.name} -- ${data.error ?? "unknown error"}`);
      } else if (data.skipped) {
        setMessage(`${file.name} already ingested -- skipped duplicate.`);
      } else {
        setMessage(`${file.name} ingested (${data.chunkCount} chunks).`);
      }
    }

    setBusy(false);
    onUploaded();
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="border border-dashed border-line rounded-md p-4 text-center">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".txt,.md"
        className="hidden"
        id="file-upload"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <label
        htmlFor="file-upload"
        className="cursor-pointer text-sm text-signal2 hover:underline"
      >
        {busy ? "Uploading & embedding..." : "Upload .txt / .md documents"}
      </label>
      {message && <p className="mt-2 text-xs text-muted font-mono">{message}</p>}
    </div>
  );
}

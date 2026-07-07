
export function chunkText(
  text: string,
  chunkSize = 1200,
  overlap = 150
): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > chunkSize && current) {
      chunks.push(current.trim());
      // carry the tail of the previous chunk forward for continuity
      const tail = current.slice(-overlap);
      current = tail + "\n\n" + para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }

    // paragraph itself longer than chunkSize: hard-split it
    while (current.length > chunkSize * 1.5) {
      chunks.push(current.slice(0, chunkSize).trim());
      current = current.slice(chunkSize - overlap);
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

export function sha256Hex(input: ArrayBuffer): Promise<string> {
  return crypto.subtle.digest("SHA-256", input).then((buf) =>
    Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

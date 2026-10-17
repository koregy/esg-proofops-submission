/** Display only names supplied by the uploader/API, never infer a company from claims. */
export type DocumentMetadata = { ux1_metadata?: { original_filename?: string; title?: string; policy_sha256?: string }; display_name?: string; company_name?: string; original_filename?: string; filename?: string; title?: string };

export function metadataText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text && !/^(?:.*미제공|없음|unknown|undefined|null|n\/?a|[-—])$/i.test(text) ? text : undefined;
}

export function reportTitle(value: unknown): string | undefined {
  const text = metadataText(metadataText(value)?.replace(/\.pdf$/i, "").trim());
  if (!text || /^(?:(?:기존 )?보고서(?:\s*·?\s*(?:\d+쪽|\d+|[a-f0-9]{8}))?|분석 보고서)$/i.test(text)) return undefined;
  return text;
}

export function documentName(document: DocumentMetadata, uploadedFilename?: string): string | undefined {
  return [uploadedFilename, document.ux1_metadata?.original_filename, document.ux1_metadata?.title,
    document.original_filename, document.filename, document.title, document.display_name].map(reportTitle).find(Boolean)
    ?? metadataText(document.company_name);
}

/** Recover legacy upload names only from metadata for the exact same PDF bytes. */
export function reportNames(documents: (DocumentMetadata & { document_id: string; sha256?: string })[]): Record<string, string | undefined> {
  const bySha = new Map<string, string>();
  for (const doc of documents) {
    const name = documentName(doc);
    if (doc.sha256 && name && !bySha.has(doc.sha256)) bySha.set(doc.sha256, name);
  }
  return Object.fromEntries(documents.map(doc => [doc.document_id, documentName(doc) ?? (doc.sha256 ? bySha.get(doc.sha256) : undefined)]));
}

export function cleanReportName(name: string): string {
  const file = name.replace(/^.*[/\\]/, "").replace(/\.pdf$/i, "");
  const match = /^(.+?)[_ -]+Sustainability[_ -]*Report[_ -]*(20\d{2})(?:[_ -]+(?:KOR|KR|ENG|EN))?$/i.exec(file);
  return match ? `${match[1].replace(/_/g, " ")} ${match[2]} 지속가능경영보고서` : file.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

/** Display only names supplied by the uploader/API, never infer a company from claims. */
export type DocumentMetadata = { display_name?: string; company_name?: string; original_filename?: string; filename?: string; title?: string };

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
  return [uploadedFilename, document.original_filename, document.filename, document.title, document.display_name].map(reportTitle).find(Boolean)
    ?? metadataText(document.company_name);
}

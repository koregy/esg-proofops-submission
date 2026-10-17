import { metadataText, reportTitle, type DocumentMetadata } from "./documentName";

/** Filename/title convention only; never guess a company from claim text or PDF author. */
export function ux1CompanyName(document: DocumentMetadata): string | undefined {
  const explicit = metadataText(document.company_name);
  if (explicit) return explicit;
  const name = document.ux1_metadata?.original_filename ?? document.original_filename ?? document.filename ?? document.ux1_metadata?.title ?? document.title;
  const title = reportTitle(name);
  if (!title) return undefined;
  const match = /^(.{2,60}?)\s*[-_ ]+20\d{2}\s*[-_ ]*(?:지속가능(?:경영)?|ESG|sustainability|sustainable)/i.exec(title);
  const prefix = match?.[1] ?? /^(.{2,60}?)[_ -]+(?:sustainability(?:report)?|sustainable|ESG|지속가능(?:경영)?)(?:[_ -]|report|보고서|20\d{2}|$)/i.exec(title)?.[1];
  return prefix && !/^20\d{2}$/.test(prefix) ? metadataText(prefix) : undefined;
}
export async function uploadMetadata(file: Blob): Promise<{ original_filename?: string; title?: string }> {
  const original_filename = typeof File !== "undefined" && file instanceof File ? file.name.replace(/.*[/\\]/, "").replace(/[\x00-\x1f]/g, " ").slice(0,200) : undefined;
  let title: string | undefined;
  try {
    const { PDFDocument } = await import("pdf-lib");
    const pdf = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
    title = reportTitle(pdf.getTitle()?.replace(/[\x00-\x1f]/g, " "))?.slice(0,200);
  } catch { /* Metadata is optional; the server still validates the untouched PDF bytes. */ }
  return { original_filename, title };
}

const IMAGE_EXTENSIONS = new Set([
  "avif",
  "bmp",
  "gif",
  "heic",
  "heif",
  "jpeg",
  "jpg",
  "png",
  "svg",
  "webp",
]);

export function isImageFile(input: { mimeType?: string | null; originalFilename: string }): boolean {
  if (input.mimeType?.startsWith("image/")) return true;
  const extension = input.originalFilename.split(".").pop()?.toLowerCase();
  return extension ? IMAGE_EXTENSIONS.has(extension) : false;
}

export function fileDownloadUrl(id: string): string {
  return `/api/files/${id}?download=1`;
}

export function filePreviewUrl(id: string): string {
  return `/api/files/${id}?inline=1`;
}

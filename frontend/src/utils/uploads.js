export const MEDIA_UPLOAD_TIMEOUT_MS = 180000;

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

export function getMediaValidationError(file) {
  if (!file) return "";

  if (ALLOWED_IMAGE_TYPES.has(file.type)) {
    return file.size > MAX_IMAGE_SIZE ? "Las imágenes deben pesar 10 MB o menos." : "";
  }

  if (ALLOWED_VIDEO_TYPES.has(file.type)) {
    return file.size > MAX_VIDEO_SIZE ? "Los vídeos deben pesar 100 MB o menos." : "";
  }

  return "Solo se permiten imágenes JPG, PNG, WEBP y vídeos MP4, MOV o WEBM.";
}

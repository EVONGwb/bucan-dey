export function optimizeCloudinaryImage(url, { width = 720, quality = "auto:eco" } = {}) {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }

  return url.replace(
    "/upload/",
    `/upload/f_auto,q_${quality},c_limit,w_${width}/`
  );
}

export function buildResponsiveSrcSet(url) {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return undefined;
  }

  return [360, 540, 720].map((width) => {
    const optimized = optimizeCloudinaryImage(url, { width });
    return `${optimized} ${width}w`;
  }).join(", ");
}

export function getApiErrorMessage(error) {
  if (error.code === "ECONNABORTED") {
    return "La subida tardó demasiado. Prueba con un archivo más ligero o una conexión más estable.";
  }

  const detail = error.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(" ");
  }

  if (typeof detail === "string") {
    return detail;
  }

  return "No se pudo completar la acción. Inténtalo de nuevo.";
}

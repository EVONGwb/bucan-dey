import { useEffect, useState } from "react";

function readConnection() {
  if (typeof navigator === "undefined") {
    return { isDataSaver: false, effectiveType: "" };
  }

  const connection =
    navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (!connection) {
    return { isDataSaver: false, effectiveType: "" };
  }

  const effectiveType = connection.effectiveType || "";
  return {
    isDataSaver:
      Boolean(connection.saveData) ||
      effectiveType === "slow-2g" ||
      effectiveType === "2g",
    effectiveType,
  };
}

export function useDataSaverMode() {
  const [state, setState] = useState(readConnection);

  useEffect(() => {
    const connection =
      navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (!connection?.addEventListener) return undefined;

    function handleChange() {
      setState(readConnection());
    }

    connection.addEventListener("change", handleChange);
    return () => connection.removeEventListener("change", handleChange);
  }, []);

  return state;
}

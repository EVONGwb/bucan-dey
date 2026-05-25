import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import apiClient, {
  getAuthToken,
  setAuthToken,
  setUnauthorizedHandler,
} from "../api/client.js";

const AuthContext = createContext(null);

function getErrorMessage(error) {
  const detail = error.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(" ");
  }

  if (typeof detail === "string") {
    return detail;
  }

  return "No se pudo completar la acción. Inténtalo de nuevo.";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => getAuthToken());
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const loadMe = useCallback(async () => {
    const storedToken = getAuthToken();

    if (!storedToken) {
      clearSession();
      setIsLoading(false);
      return null;
    }

    try {
      setIsLoading(true);
      const response = await apiClient.get("/auth/me");
      setToken(storedToken);
      setUser(response.data);
      return response.data;
    } catch {
      clearSession();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [clearSession]);

  const saveSession = useCallback((data) => {
    setAuthToken(data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(async (payload) => {
    try {
      const response = await apiClient.post("/auth/login", payload);
      return saveSession(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }, [saveSession]);

  const register = useCallback(async (payload) => {
    try {
      const response = await apiClient.post("/auth/register", payload);
      return saveSession(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }, [saveSession]);

  const loginWithGoogle = useCallback(async (idToken) => {
    try {
      const response = await apiClient.post("/auth/google", { id_token: idToken });
      return saveSession(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }, [saveSession]);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    loadMe();

    return () => setUnauthorizedHandler(null);
  }, [clearSession, loadMe]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading,
      login,
      register,
      loginWithGoogle,
      logout,
      loadMe,
    }),
    [user, token, isLoading, login, register, loginWithGoogle, logout, loadMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}

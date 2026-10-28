import axios, { AxiosError } from "axios";

export const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Attach auth token to every request
apiClient.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("pds_token") : null;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Translate HTTP/network errors into user-friendly messages
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    const serverMessage =
      error.response?.data?.error || error.response?.data?.message;

    if (serverMessage) {
      // Surface the exact server-side message (e.g. "The selected role does not match...")
      return Promise.reject(new Error(serverMessage));
    }

    if (
      error.code === "ECONNABORTED" ||
      error.message?.toLowerCase().includes("timeout")
    ) {
      return Promise.reject(
        new Error(
          "Request timed out. Please check your connection and try again.",
        ),
      );
    }

    if (!error.response) {
      return Promise.reject(
        new Error("Unable to reach the server. Please check your connection."),
      );
    }

    const status = error.response.status;
    if (status === 401)
      return Promise.reject(
        new Error("Invalid email or password. Please try again."),
      );
    if (status === 403)
      return Promise.reject(
        new Error("Access denied. You do not have permission for this action."),
      );
    if (status === 404)
      return Promise.reject(new Error("The requested resource was not found."));
    if (status === 409)
      return Promise.reject(
        new Error("An account with this email address already exists."),
      );
    if (status >= 500)
      return Promise.reject(
        new Error("Server error. Please try again in a moment."),
      );

    return Promise.reject(new Error("Something went wrong. Please try again."));
  },
);

export const delay = (ms: number = 300) =>
  new Promise((resolve) => setTimeout(resolve, ms));

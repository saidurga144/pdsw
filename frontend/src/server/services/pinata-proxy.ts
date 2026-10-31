const DEFAULT_PINATA_SERVICE_URL =
  process.env.NODE_ENV === "production"
    ? "https://pdsw-pinata.onrender.com"
    : "http://127.0.0.1:5001";

function normalizeServiceOrigin(value: string): string {
  try {
    // Accept either the service origin or a mistakenly configured full API URL.
    return new URL(value.trim()).origin.replace(/\/$/, "");
  } catch {
    return "";
  }
}

function getServiceOrigins(): string[] {
  const configured = normalizeServiceOrigin(
    process.env.PINATA_SERVICE_URL || "",
  );
  return [...new Set([configured, DEFAULT_PINATA_SERVICE_URL].filter(Boolean))];
}

/** Calls the Pinata service, falling back to the deployment defined in render.yaml. */
export async function fetchPinataService(
  path: "/api/ipfs/upload" | "/api/ipfs/health",
  init?: RequestInit,
): Promise<Response> {
  const origins = getServiceOrigins();
  let lastError: unknown;

  for (const [index, origin] of origins.entries()) {
    try {
      const response = await fetch(`${origin}${path}`, init);
      if (response.status === 404 && index < origins.length - 1) continue;
      return response;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Pinata service could not be reached.");
}

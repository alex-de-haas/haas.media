export const API_DOWNLOADER_URL = process.env.NEXT_PUBLIC_API_DOWNLOADER_URL!;

export async function getApiToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/token");
    if (!res.ok) return null;
    const data = await res.json();
    return data.accessToken ?? null;
  } catch {
    return null;
  }
}

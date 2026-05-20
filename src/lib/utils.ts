import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getMediaUrl(url?: string): string {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const normalizedPath = url.startsWith("/") ? url : `/${url}`;
  return `${base}${normalizedPath}`;
}


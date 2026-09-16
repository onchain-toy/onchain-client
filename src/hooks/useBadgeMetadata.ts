import { useQueries } from "@tanstack/react-query";
import type { BadgeTypeInfo } from "./useBadgeTypeIds";

export interface BadgeMetadata {
  name?: string;
  image?: string;
}

async function fetchMetadata(uri: string): Promise<BadgeMetadata | null> {
  try {
    const res = await fetch(uri);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      name: typeof data.name === "string" ? data.name : undefined,
      image: typeof data.image === "string" ? data.image : undefined,
    };
  } catch {
    return null;
  }
}

// Badge metadata (name/image) lives off-chain at each badge type's `uri`.
// Cached indefinitely per URI since metadata is meant to be immutable once
// a badge type is created (no setURI by design).
export function useBadgeMetadataList(badgeTypes: BadgeTypeInfo[] | undefined) {
  return useQueries({
    queries: (badgeTypes ?? []).map((b) => ({
      queryKey: ["badgeMetadata", b.uri],
      queryFn: () => fetchMetadata(b.uri),
      staleTime: Infinity,
      retry: 1,
    })),
  });
}

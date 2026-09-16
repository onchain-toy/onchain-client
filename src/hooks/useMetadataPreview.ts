import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMetadata } from "./useBadgeMetadata";

// Debounces a metadata URI as it's typed and fetches+validates it the same
// way BadgeList reads live badges - so an admin sees the actual name/image
// *before* signing createBadgeType. A typo (e.g. a bare "123") is caught
// here instead of becoming a permanent, unfixable on-chain badge type
// (no setURI by design - see the metadata-immutability decision).
export function useMetadataPreview(uri: string) {
  const trimmed = uri.trim();
  const [debounced, setDebounced] = useState(trimmed);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(trimmed), 500);
    return () => clearTimeout(t);
  }, [trimmed]);

  const query = useQuery({
    queryKey: ["metadataPreview", debounced],
    queryFn: () => fetchMetadata(debounced),
    enabled: debounced.length > 0,
    retry: false,
    staleTime: 30_000,
  });

  const settled = debounced === trimmed && !query.isFetching;
  const isValid = settled && Boolean(query.data?.name && query.data?.image);

  return {
    isEmpty: trimmed.length === 0,
    isChecking: trimmed.length > 0 && !settled,
    isValid,
    isInvalid: settled && trimmed.length > 0 && !isValid,
    data: query.data,
  };
}

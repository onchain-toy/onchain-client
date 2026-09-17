import { useQueries, useQuery } from "@tanstack/react-query";
import { useBadgeTypeIds } from "./useBadgeTypeIds";
import { fetchMetadata } from "./useBadgeMetadata";

// Badge metadata now lives in onchain-contract's own repo (not metadata-test,
// which was erc-1155's source - see the "which repo is canonical" decision).
const REPO_API_URL = "https://api.github.com/repos/onchain-toy/onchain-contract/contents/metadata";
const REPO_RAW_BASE = "https://raw.githubusercontent.com/onchain-toy/onchain-contract/main/metadata";

interface RepoFile {
  name: string;
  url: string;
}

async function fetchRepoJsonFiles(): Promise<RepoFile[]> {
  const res = await fetch(REPO_API_URL);
  if (!res.ok) throw new Error(`GitHub API 요청 실패 (${res.status})`);
  const data = (await res.json()) as { name: string; type: string }[];
  return data
    .filter((item) => item.type === "file" && item.name.endsWith(".json"))
    .map((item) => ({ name: item.name, url: `${REPO_RAW_BASE}/${item.name}` }));
}

// Best-effort admin checklist, NOT a reservation system: badge ids are
// assigned sequentially by the contract at the moment createBadgeType is
// called, so a metadata file sitting in the repo has no claim on any future
// id (see A7 - the file numbering and on-chain id numbering can and do
// diverge, e.g. after the "123" incident). This only flags "nobody has used
// this file's URL in an on-chain badge yet" - a reminder, not a preview.
export function useUnusedMetadataFiles() {
  const { data: badgeTypes } = useBadgeTypeIds();

  const repoFilesQuery = useQuery({
    queryKey: ["metadataRepoFiles"],
    queryFn: fetchRepoJsonFiles,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const usedUris = new Set((badgeTypes ?? []).map((b) => b.uri));
  const unusedFiles = (repoFilesQuery.data ?? []).filter((f) => !usedUris.has(f.url));

  const previews = useQueries({
    queries: unusedFiles.map((f) => ({
      queryKey: ["badgeMetadata", f.url],
      queryFn: () => fetchMetadata(f.url),
      staleTime: Infinity,
      retry: 1,
    })),
  });

  return {
    isLoading: repoFilesQuery.isLoading,
    error: repoFilesQuery.error,
    files: unusedFiles.map((f, i) => ({ ...f, metadata: previews[i]?.data })),
  };
}

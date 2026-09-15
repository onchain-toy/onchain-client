import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Refetches every wagmi/react-query read (badge list, balances, roles) once
// a write transaction confirms, so the UI reflects the new on-chain state
// without needing a manual page reload.
export function useRefetchOnConfirm(phase: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (phase === "confirmed") {
      queryClient.invalidateQueries();
    }
  }, [phase, queryClient]);
}

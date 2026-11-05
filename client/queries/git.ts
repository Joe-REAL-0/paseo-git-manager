import { useQuery } from "@tanstack/react-query";
import { useRpc } from "@getpaseo/plugin/client";
import { statusRpc, diffRpc } from "../../shared/contracts/git";

export function useGitStatus(hostId: string, workspaceId: string) {
  const status = useRpc(statusRpc);
  return useQuery({
    queryKey: ["git-manager", hostId, workspaceId, "status"],
    queryFn: () => status({ workspaceId }),
    refetchInterval: 10_000, refetchOnWindowFocus: true, refetchOnReconnect: true, retry: false,
  });
}

export function useGitDiff(hostId: string, workspaceId: string, path: string | null, scope: "worktree" | "index", snapshotTime?: string) {
  const diff = useRpc(diffRpc);
  return useQuery({
    queryKey: ["git-manager", hostId, workspaceId, "diff", path, scope, snapshotTime],
    queryFn: () => diff({ workspaceId, path: path!, scope }),
    enabled: path !== null, retry: false, gcTime: 30_000,
  });
}

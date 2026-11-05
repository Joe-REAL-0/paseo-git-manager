import { z } from "zod";

// 持久化设计契约；发现 worktree 不等于已接管任务。
export const taskSchema = z.object({
  version: z.literal(1), id: z.string(), title: z.string(), createdAt: z.string(),
  hostId: z.string(), commonGitDirectory: z.string(), sourceCheckout: z.string(),
  worktreePath: z.string(), workspaceIds: z.array(z.string()), agentIds: z.array(z.string()),
  branch: z.string(), targetBranch: z.string(), baseCommit: z.string(),
  ownership: z.enum(["created", "adopted", "discovered"]),
  pushTarget: z.object({ remote: z.string(), ref: z.string() }).nullable(),
  development: z.enum(["active", "archived"]),
  merge: z.enum(["unmerged", "partial", "merged", "conflict"]),
  push: z.enum(["unconfigured", "pending", "pushed", "failed"]),
  cleanup: z.enum(["not-started", "waiting-host", "worktree-removed", "branch-deleted", "failed"]),
  evidence: z.object({ sourceOid: z.string(), targetOid: z.string(), observedAt: z.string() }).nullable(),
  pushedOid: z.string().nullable(),
});
export type Task = z.infer<typeof taskSchema>;

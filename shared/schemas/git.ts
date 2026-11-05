import { z } from "zod";

export const workspaceInput = z.object({ workspaceId: z.string().min(1).max(256) }).strict();
export const filePath = z.string().min(1).max(4096).refine(
  (value) => !value.includes("\0") && !value.startsWith("/") && !value.includes("\\") &&
    !/^[A-Za-z]:/.test(value) && !value.split("/").some((part) => part === ".." || part === "."),
  "必须使用工作区内的相对文件路径",
);
export const changeSchema = z.object({
  path: z.string(), originalPath: z.string().optional(),
  index: z.string(), worktree: z.string(), conflict: z.boolean(), untracked: z.boolean(),
});
export const worktreeSchema = z.object({
  path: z.string(), head: z.string().nullable(), branch: z.string().nullable(),
  bare: z.boolean(), locked: z.boolean(), prunable: z.boolean(),
});
export const snapshotSchema = z.object({
  workspaceId: z.string(), directory: z.string(), commonGitDirectory: z.string(),
  branch: z.string().nullable(), changes: z.array(changeSchema),
  worktrees: z.array(worktreeSchema), observedAt: z.string(),
});
export type Change = z.infer<typeof changeSchema>;
export type Worktree = z.infer<typeof worktreeSchema>;

import type { Change, Worktree } from "../../shared/schemas/git";

export function parseStatus(output: string): Change[] {
  const records = output.split("\0");
  const changes: Change[] = [];
  for (let i = 0; i < records.length; i++) {
    const entry = records[i];
    if (!entry) continue;
    if (entry.length < 4 || entry[2] !== " ") throw new Error("无法解析 Git status 输出");
    const index = entry[0]!;
    const worktree = entry[1]!;
    const renamed = [index, worktree].some((code) => code === "R" || code === "C");
    const originalPath = renamed ? records[++i] : undefined;
    if (renamed && !originalPath) throw new Error("Git 重命名记录缺少源路径");
    changes.push({
      path: entry.slice(3), ...(originalPath ? { originalPath } : {}), index, worktree,
      conflict: ["DD", "AU", "UD", "UA", "DU", "AA", "UU"].includes(index + worktree),
      untracked: index === "?" && worktree === "?",
    });
  }
  return changes;
}

export function parseWorktrees(output: string): Worktree[] {
  const result: Worktree[] = [];
  let current: Worktree | undefined;
  for (const field of output.split("\0")) {
    if (field.startsWith("worktree ")) {
      current = { path: field.slice(9), head: null, branch: null, bare: false, locked: false, prunable: false };
      result.push(current);
    } else if (current) {
      if (field.startsWith("HEAD ")) current.head = field.slice(5);
      else if (field.startsWith("branch refs/heads/")) current.branch = field.slice(18);
      else if (field === "bare") current.bare = true;
      else if (field === "locked" || field.startsWith("locked ")) current.locked = true;
      else if (field === "prunable" || field.startsWith("prunable ")) current.prunable = true;
    }
  }
  return result;
}

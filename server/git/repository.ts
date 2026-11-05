import { realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { filePath } from "../../shared/schemas/git";
import { parseStatus, parseWorktrees } from "./parsers";
import { runGit } from "./runner";

export class GitRepository {
  constructor(readonly directory: string) {}

  static async open(directory: string): Promise<GitRepository> {
    const root = (await runGit(directory, ["rev-parse", "--show-toplevel"])).replace(/\n$/, "");
    return new GitRepository(await realpath(root));
  }

  async changes() {
    return parseStatus(await runGit(this.directory, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]));
  }

  async snapshot(workspaceId: string) {
    const [changes, worktrees, common, head] = await Promise.all([
      this.changes(),
      runGit(this.directory, ["worktree", "list", "--porcelain", "-z"]),
      runGit(this.directory, ["rev-parse", "--git-common-dir"]),
      runGit(this.directory, ["status", "--porcelain=v2", "--branch", "-z", "--untracked-files=no"]),
    ]);
    const branch = head.split("\0").find((line) => line.startsWith("# branch.head "))?.slice(14);
    return {
      workspaceId, directory: this.directory,
      commonGitDirectory: await realpath(resolve(this.directory, common.replace(/\n$/, ""))),
      branch: branch && branch !== "(detached)" ? branch : null,
      changes, worktrees: parseWorktrees(worktrees), observedAt: new Date().toISOString(),
    };
  }

  async diff(path: string, scope: "worktree" | "index") {
    filePath.parse(path);
    const change = (await this.changes()).find((entry) => entry.path === path);
    if (!change) throw new Error("文件状态已变化，请刷新后重新选择");
    if (change.untracked) return { kind: "untracked" as const, text: "未跟踪文件：尚未提供内容预览。" };
    if (change.conflict) return { kind: "conflict" as const, text: "此文件存在合并冲突；请在编辑器中检查并解决。" };
    const text = await runGit(this.directory, [
      "diff", "--no-ext-diff", "--no-textconv", "--no-color", "--no-relative",
      ...(scope === "index" ? ["--cached"] : []), "--", path,
      ...(change.originalPath ? [change.originalPath] : []),
    ]);
    return { kind: "patch" as const, text };
  }
}

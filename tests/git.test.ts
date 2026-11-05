import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { GitRepository } from "../server/git/repository";
import { GitError, runGit } from "../server/git/runner";
import { filePath } from "../shared/schemas/git";
import { repositoryForWorkspace } from "../server/tasks/workspace";

async function fixture(t: { after(fn: () => Promise<void>): void }) {
  const root = await mkdtemp(join(tmpdir(), "paseo-git-manager-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args: string[]) => execFileSync("git", args, {
    cwd: root, encoding: "utf8", env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" },
  });
  git("init", "-b", "develop");
  git("config", "user.name", "Test User");
  git("config", "user.email", "test@example.invalid");
  git("config", "commit.gpgsign", "false");
  git("config", "core.hooksPath", join(root, "no-hooks"));
  return { root, git, repo: await GitRepository.open(root) };
}

test("无 HEAD 仓库可以读取状态及首次暂存 diff", async (t) => {
  const { root, repo, git } = await fixture(t);
  assert.equal((await repo.snapshot("ws")).branch, "develop");
  await writeFile(join(root, "中文 空格.txt"), "first\n");
  assert.equal((await repo.changes())[0]?.untracked, true);
  git("add", "--", "中文 空格.txt");
  assert.match((await repo.diff("中文 空格.txt", "index")).text, /\+first/);
});

test("同文件已暂存和未暂存修改分别读取，不改变 index", async (t) => {
  const { root, repo, git } = await fixture(t);
  await writeFile(join(root, "file.txt"), "base\n");
  git("add", "."); git("commit", "-m", "base");
  await writeFile(join(root, "file.txt"), "staged\n"); git("add", ".");
  await writeFile(join(root, "file.txt"), "working\n");
  const before = git("write-tree");
  const [change] = await repo.changes();
  assert.equal(change?.index, "M"); assert.equal(change?.worktree, "M");
  assert.match((await repo.diff("file.txt", "index")).text, /\+staged/);
  assert.match((await repo.diff("file.txt", "worktree")).text, /\+working/);
  assert.equal(git("write-tree"), before);
});

test("NUL 解析保留换行文件名、重命名源和删除", async (t) => {
  const { root, repo, git } = await fixture(t);
  await writeFile(join(root, "旧\n名.txt"), "rename\n");
  await writeFile(join(root, "delete.txt"), "delete\n");
  git("add", "."); git("commit", "-m", "base");
  git("mv", "旧\n名.txt", "新 名.txt"); git("rm", "delete.txt");
  const changes = await repo.changes();
  assert.equal(changes.find((c) => c.path === "新 名.txt")?.originalPath, "旧\n名.txt");
  assert.equal(changes.find((c) => c.path === "delete.txt")?.index, "D");
  assert.match((await repo.diff("新 名.txt", "index")).text, /rename from/);
});

test("读取真实多 worktree，并保持目标分支不变", async (t) => {
  const { root, repo, git } = await fixture(t);
  git("commit", "--allow-empty", "-m", "base");
  const taskPath = join(root, "task checkout");
  git("worktree", "add", "-b", "task/fix-login", taskPath);
  const taskRepo = await GitRepository.open(taskPath);
  const snapshot = await taskRepo.snapshot("task-ws");
  assert.equal(snapshot.branch, "task/fix-login");
  assert.equal(snapshot.worktrees.length, 2);
  assert.deepEqual(snapshot.worktrees.map((w) => w.branch).sort(), ["develop", "task/fix-login"]);
  assert.equal(snapshot.commonGitDirectory, (await repo.snapshot("main-ws")).commonGitDirectory);
  assert.equal(git("branch", "--show-current").trim(), "develop");
});

test("路径边界与 Git 字面路径，拒绝过期选择", async (t) => {
  for (const value of ["../secret", "/etc/passwd", "a/../../b", "C:/secret", "a\\b", "a\0b"]) {
    assert.equal(filePath.safeParse(value).success, false, value);
  }
  const { root, repo, git } = await fixture(t);
  await writeFile(join(root, ":(glob)*"), "literal\n");
  await writeFile(join(root, "another"), "other\n");
  git("add", ".");
  const diff = await repo.diff(":(glob)*", "index");
  assert.match(diff.text, /\+literal/); assert.doesNotMatch(diff.text, /\+other/);
  await assert.rejects(repo.diff("missing", "index"), /文件状态已变化/);
  await assert.rejects(repositoryForWorkspace({ resolve: async () => null }, "unknown"), /工作区不存在/);
});

test("二进制与未跟踪文件不伪装成文本补丁", async (t) => {
  const { root, repo, git } = await fixture(t);
  await writeFile(join(root, "binary"), Buffer.from([0, 1, 2]));
  assert.equal((await repo.diff("binary", "worktree")).kind, "untracked");
  git("add", ".");
  assert.match((await repo.diff("binary", "index")).text, /Binary files/);
});

test("Git 错误保留退出码及 stderr", async (t) => {
  const { root } = await fixture(t);
  await assert.rejects(runGit(root, ["rev-parse", "--verify", "missing-ref"]), (error) => {
    assert.ok(error instanceof GitError);
    assert.equal(error.exitCode, 128);
    assert.ok(error.stderr.length > 0);
    return true;
  });
});

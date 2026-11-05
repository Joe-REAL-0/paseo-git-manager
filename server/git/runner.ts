import { execFile } from "node:child_process";

export class GitError extends Error {
  constructor(message: string, readonly exitCode: string | number | null, readonly stderr: string) {
    super(message);
    this.name = "GitError";
  }
}

// 只暴露给服务端适配层，绝不注册任意命令 RPC。
export function runGit(cwd: string, args: readonly string[]): Promise<string> {
  const env = { ...process.env };
  // 宿主启动目录的 Git 环境不能重定向所选 workspace。
  for (const key of Object.keys(env)) if (key.startsWith("GIT_")) delete env[key];
  return new Promise((resolve, reject) => {
    execFile("git", ["--no-optional-locks", "--literal-pathspecs", ...args], {
      cwd, env: { ...env, GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" },
      encoding: "utf8", timeout: 15_000, maxBuffer: 2 * 1024 * 1024, windowsHide: true,
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new GitError(`Git 操作失败：${stderr.trim() || error.message}`, error.code ?? null, stderr));
      } else resolve(stdout);
    });
  });
}

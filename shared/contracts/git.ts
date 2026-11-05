import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";
import { filePath, snapshotSchema, workspaceInput } from "../schemas/git";

export const statusRpc = defineRpc({ name: "git.status", input: workspaceInput, output: snapshotSchema });
export const diffRpc = defineRpc({
  name: "git.diff",
  input: workspaceInput.extend({ path: filePath, scope: z.enum(["worktree", "index"]) }),
  output: z.object({ text: z.string(), kind: z.enum(["patch", "untracked", "conflict"]) }),
});

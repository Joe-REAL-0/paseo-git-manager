import assert from "node:assert/strict";
import { test } from "node:test";
import { parseStatus, parseWorktrees } from "../server/git/parsers";

test("冲突码、未跟踪和双重修改分类", () => {
  const result = parseStatus("UU conflict\0?? new\0MM both\0");
  assert.equal(result[0]?.conflict, true);
  assert.equal(result[1]?.untracked, true);
  assert.equal(result[2]?.index, "M");
  assert.equal(result[2]?.worktree, "M");
  assert.throws(() => parseStatus("R  missing-source\0"), /缺少源路径/);
});

test("worktree 的 bare、detached、locked、prunable 信息", () => {
  const trees = parseWorktrees("worktree /repo\0bare\0\0worktree /task\0HEAD abc\0detached\0locked reason\0prunable reason\0\0");
  assert.equal(trees[0]?.bare, true);
  assert.equal(trees[1]?.branch, null);
  assert.equal(trees[1]?.locked, true);
  assert.equal(trees[1]?.prunable, true);
});

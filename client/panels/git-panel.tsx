import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type PluginWorkspacePanelProps, useWorkspace } from "@getpaseo/plugin/client";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ChangeList } from "../components/change-list";
import { useGitDiff, useGitStatus } from "../queries/git";

export function GitPanel(props: PluginWorkspacePanelProps) {
  // 每个面板拥有独立缓存，不在不同 daemon 的同名 workspace 之间共享数据。
  const [queryClient] = useState(() => new QueryClient());
  useEffect(() => () => queryClient.clear(), [queryClient]);
  return <QueryClientProvider client={queryClient}><GitPanelContent {...props} /></QueryClientProvider>;
}

function GitPanelContent({ workspaceId, host, theme, layout }: PluginWorkspacePanelProps) {
  const workspace = useWorkspace(workspaceId, ({ name }) => ({ name }));
  const status = useGitStatus(host.id, workspaceId);
  const [selection, setSelection] = useState<{ path: string; scope: "worktree" | "index" } | null>(null);
  useEffect(() => setSelection(null), [host.id, workspaceId]);
  const diff = useGitDiff(host.id, workspaceId, selection?.path ?? null, selection?.scope ?? "worktree", status.data?.observedAt);
  const color = theme.colors.foreground;
  const muted = theme.colors.foregroundMuted;
  const changes = status.data?.changes ?? [];
  const groups = [
    { title: "冲突", entries: changes.filter((c) => c.conflict), scope: "worktree" as const },
    { title: "未暂存", entries: changes.filter((c) => !c.conflict && !c.untracked && c.worktree !== " "), scope: "worktree" as const },
    { title: "已暂存", entries: changes.filter((c) => !c.conflict && !c.untracked && c.index !== " "), scope: "index" as const },
    { title: "未跟踪", entries: changes.filter((c) => c.untracked), scope: "worktree" as const },
  ];
  return <ScrollView style={{ flex: 1, backgroundColor: theme.colors.surface0 }}
    contentContainerStyle={{ padding: layout.compact ? 16 : 24, gap: 16 }}>
    <Text style={{ color, fontSize: 22, fontWeight: "bold" }}>{workspace?.name ?? "工作区"} · Git</Text>
    <Text style={{ color: muted }}>只读预览 · 每 10 秒刷新</Text>
    <Pressable accessibilityRole="button" disabled={status.isFetching} onPress={() => void status.refetch()}>
      <Text style={{ color }}>{status.isFetching ? "正在刷新…" : "刷新变更"}</Text>
    </Pressable>
    {status.error ? <Text style={{ color }} accessibilityRole="alert">读取失败：{status.error.message}</Text> : null}
    {status.data ? <>
      <Text style={{ color }}>分支：{status.data.branch ?? "游离 HEAD"} · 合并目标：尚未接管</Text>
      <Text selectable style={{ color: muted }}>{status.data.directory}</Text>
      {changes.length === 0 ? <Text style={{ color }}>工作区干净</Text> : null}
      <View style={{ flexDirection: layout.compact ? "column" : "row", gap: 24 }}>
        <View style={{ flex: 1, gap: 16 }}>{groups.map((group) => <ChangeList key={group.title}
          title={group.title} changes={group.entries} color={color}
          onSelect={(path) => setSelection({ path, scope: group.scope })} />)}</View>
        <View style={{ flex: 2, gap: 12 }}>
          <Text style={{ color, fontWeight: "bold" }}>{selection ? `${selection.path} · ${selection.scope === "index" ? "已暂存（相对 HEAD）" : "未暂存（相对暂存区）"}` : "选择文件查看差异"}</Text>
          {diff.isFetching ? <Text style={{ color: muted }}>正在读取差异…</Text> : null}
          {diff.error ? <Text style={{ color }} accessibilityRole="alert">{diff.error.message}</Text> : null}
          {selection && diff.data ? <Text selectable style={{ color, fontFamily: "monospace", fontSize: 12 }}>{diff.data.text || "此范围没有差异"}</Text> : null}
        </View>
      </View>
      <Text style={{ color, fontWeight: "bold" }}>仓库 worktree（仅发现）</Text>
      {status.data.worktrees.map((tree) => <View key={tree.path} style={{ gap: 4 }}>
        <Text style={{ color }}>{tree.branch ?? (tree.bare ? "裸仓库" : "游离 HEAD")}{tree.locked ? " · 已锁定" : ""}{tree.prunable ? " · 待核对残留" : ""}</Text>
        <Text selectable style={{ color: muted }}>{tree.path}</Text>
      </View>)}
    </> : null}
  </ScrollView>;
}

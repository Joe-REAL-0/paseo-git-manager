import type { PluginClientContext } from "@getpaseo/plugin/client";
import { GitPanel } from "./client/panels/git-panel";

export default function contribute(client: PluginClientContext) {
  client.addWorkspacePanel({
    id: "git-manager", title: "Git Manager", icon: "GitBranch", context: "workspace",
    locations: ["workspace", "explorer"], Component: GitPanel,
  });
  client.addCommandCenterItem({
    id: "open-git-manager", title: "查看 Git 变更", icon: "GitBranch", context: "workspace",
    onSelect({ openPanel }) { openPanel("git-manager"); },
  });
  return () => {};
}

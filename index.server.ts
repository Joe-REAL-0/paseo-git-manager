import type { PluginServerContext } from "@getpaseo/plugin/server";
import { statusRpc, diffRpc } from "./shared/contracts/git";
import { repositoryForWorkspace } from "./server/tasks/workspace";

export default function contribute(server: PluginServerContext) {
  server.handle(statusRpc, async ({ workspaceId }, { paseo }) => {
    const repo = await repositoryForWorkspace({
      resolve: async (id) => {
        const snapshot = await paseo.workspaces.ref(id).refresh();
        return snapshot ? { directory: snapshot.workspaceDirectory } : null;
      },
    }, workspaceId);
    return repo.snapshot(workspaceId);
  });
  server.handle(diffRpc, async ({ workspaceId, path, scope }, { paseo }) => {
    const repo = await repositoryForWorkspace({
      resolve: async (id) => {
        const snapshot = await paseo.workspaces.ref(id).refresh();
        return snapshot ? { directory: snapshot.workspaceDirectory } : null;
      },
    }, workspaceId);
    return repo.diff(path, scope);
  });
  return () => {};
}

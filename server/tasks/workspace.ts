import { GitRepository } from "../git/repository";

export interface WorkspaceResolver {
  resolve(workspaceId: string): Promise<{ directory: string } | null>;
}

export async function repositoryForWorkspace(resolver: WorkspaceResolver, workspaceId: string) {
  const workspace = await resolver.resolve(workspaceId);
  if (!workspace) throw new Error("工作区不存在或已不可访问");
  return GitRepository.open(workspace.directory);
}

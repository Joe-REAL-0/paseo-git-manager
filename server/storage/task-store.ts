import type { Task } from "../../shared/schemas/task";

// P3 接入宿主私有数据目录后实现；不得将任务记录写入用户 Git 仓库。
export interface TaskStore {
  list(): Promise<Task[]>;
  get(id: string): Promise<Task | null>;
  save(task: Task): Promise<void>;
}

export interface OperationRecord {
  operationId: string;
  taskId: string;
  expectedSourceOid: string;
  expectedTargetOid: string;
  status: "started" | "succeeded" | "failed" | "needs-reconciliation";
  result?: unknown;
}

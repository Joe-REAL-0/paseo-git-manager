import { Pressable, Text, View } from "react-native";
import type { Change } from "../../shared/schemas/git";

export function ChangeList({ title, changes, color, onSelect }: {
  title: string; changes: Change[]; color: string; onSelect: (path: string) => void;
}) {
  return <View style={{ gap: 8 }}>
    <Text style={{ color, fontWeight: "bold" }}>{title}（{changes.length}）</Text>
    {changes.map((change) => <Pressable key={change.path} accessibilityRole="button"
      accessibilityLabel={`查看 ${change.path} 的差异`} onPress={() => onSelect(change.path)}
      style={{ paddingVertical: 8 }}>
      <Text style={{ color }}>{change.index}{change.worktree}  {change.path}</Text>
      {change.originalPath ? <Text style={{ color }}>原路径：{change.originalPath}</Text> : null}
    </Pressable>)}
  </View>;
}

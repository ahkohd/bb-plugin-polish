import {
  experimental_ThreadStatusGlyph as ThreadStatusGlyph,
  useSidebarThreadRowStatus,
  type PluginSidebarThread,
} from "@get-bb/plugin-sdk/app";

import { useContext } from "react";
import { compactAge, RowAppearanceContext } from "./SidebarRow";

export function ThreadStatus({ thread }: { thread: PluginSidebarThread }) {
  const rowStatus = useSidebarThreadRowStatus(thread.id);
  const { now } = useContext(RowAppearanceContext);
  if (thread.indicator === "none" && !thread.isUnread) return <span className="text-[11px] tabular-nums text-subtle-foreground">{compactAge(Math.max(thread.latestAttentionAt ?? 0, thread.updatedAt), now)}</span>;
  return (
    <ThreadStatusGlyph indicator={thread.indicator} rowStatus={rowStatus} />
  );
}

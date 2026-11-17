// The Polish sidebar: an inbox-style thread list that never re-orders itself.
// Threads sort by creation time, newest first, and hold that place. Status is
// carried by each row, not by position, so the list only moves when you act.
// Snoozed, Settled and Muted threads wait on shelves docked at the bottom.
//
// This is Beside (github.com/ahkohd/bb-plugin-beside) brought into Polish.
import {
  experimental_THREAD_ACTION_GROUPS,
  type PluginAppBuilder,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { Icon } from "./components/Icon";
import { muteThread, PushLevelError, unmuteThread } from "./muting";
import { SidebarSettings } from "./SidebarSettings";
import { ThreadInbox } from "./ThreadInbox";
import { useMutedThreadIds } from "./useMutedThreadIds";

export const MUTE_ICON = "polish.mute";
export const UNMUTE_ICON = "polish.unmute";

export function registerSidebar(app: PluginAppBuilder): void {
  app.slots.experimental_threadList({
    id: "inbox",
    title: "Polish",
    description:
      "Threads newest first in a list that never re-orders, with Snoozed, Settled and Muted shelves docked at the bottom.",
    component: ThreadInbox,
  });

  app.slots.settingsSection({
    id: "sidebar",
    title: "Sidebar",
    description:
      "The Polish thread list: bring your shelves over from Beside, and let a decision model keep routine news on its shelf.",
    component: SidebarSettings,
  });

  app.experimental_icons.register({
    name: MUTE_ICON,
    component: ({ className }) => (
      <Icon name="NotificationOff" className={className} />
    ),
  });
  app.experimental_icons.register({
    name: UNMUTE_ICON,
    component: ({ className }) => (
      <Icon name="Notification" className={className} />
    ),
  });

  app.slots.experimental_threadAction({
    id: "mute",
    title: "Mute",
    icon: MUTE_ICON,
    group: experimental_THREAD_ACTION_GROUPS.state,
    useData: () => useMutedThreadIds(),
    item: ({ thread, data, sdk }) => {
      if (data.mutedIds === null) return null;
      const isMuted = data.mutedIds.has(thread.id);
      return {
        label: isMuted ? "Unmute" : "Mute",
        icon: isMuted ? UNMUTE_ICON : MUTE_ICON,
        run: () =>
          (isMuted
            ? unmuteThread(data.rpc, sdk, thread.id)
            : muteThread(data.rpc, sdk, thread.id)
          ).catch((error: unknown) => {
            toast.error(
              error instanceof PushLevelError
                ? error.message
                : isMuted
                  ? "Could not unmute the thread"
                  : "Could not mute the thread",
            );
          }),
      };
    },
  });
}

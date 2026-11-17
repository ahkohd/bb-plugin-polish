// Settings for the Polish sidebar: bringing Beside's shelves over, then
// decision mode.
import { useCallback, useEffect, useState } from "react";
import { useRpc } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { DecisionSettings } from "./DecisionSettings";
import type { bbSidebarRpcContract } from "./server";
import {
  SETTINGS_BUTTON_CLASS,
  SettingsCard,
  SettingsGroup,
  SettingsRow,
} from "./settingsUi";

interface BesideImport {
  available: boolean;
  importedAt: number | null;
}

function BesideImportCard() {
  const rpc = useRpc<typeof bbSidebarRpcContract>();
  const [state, setState] = useState<BesideImport | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setState(await rpc.call("getBesideImport", {}));
  }, [rpc]);
  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  if (state === null || !state.available) return null;

  const bringOver = async () => {
    setBusy(true);
    try {
      const { threads } = await rpc.call("importFromBeside", {});
      toast(
        threads === 1
          ? "Brought 1 shelved thread over from Beside"
          : `Brought ${threads} shelved threads over from Beside`,
      );
      await refresh();
    } catch {
      toast.error("Could not bring Beside's shelves over");
    } finally {
      setBusy(false);
    }
  };

  const when = state.importedAt
    ? `Last brought over ${new Date(state.importedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })}.`
    : "Not brought over yet.";

  return (
    <SettingsGroup title="Beside">
      <SettingsCard>
        <SettingsRow
          label="Bring your shelves over"
          description={`Copies Beside's Snoozed, Settled and Muted threads, its rules and its decision mode setup, replacing what Polish has. Beside itself is not changed. ${when}`}
        >
          <button
            type="button"
            className={SETTINGS_BUTTON_CLASS}
            disabled={busy}
            onClick={() => void bringOver()}
          >
            {state.importedAt ? "Bring over again" : "Bring over"}
          </button>
        </SettingsRow>
      </SettingsCard>
    </SettingsGroup>
  );
}

export function SidebarSettings() {
  return (
    <div className="space-y-6">
      <BesideImportCard />
      <SettingsGroup title="Decision mode">
        <DecisionSettings />
      </SettingsGroup>
    </div>
  );
}

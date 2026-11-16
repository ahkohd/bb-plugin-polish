// Polish ships a theme (themes/polish.css), declared in package.json under
// bb.themes. The backend has nothing to do; bb requires the entry anyway.
import type { BbPluginApi } from "@get-bb/plugin-sdk";

export default async function plugin(bb: BbPluginApi) {
  bb.log.info("Polish theme loaded");
}

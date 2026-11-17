// Polish's backend. The theme is CSS (themes/polish.css, declared in
// package.json under bb.themes) and needs nothing here; the sidebar keeps its
// shelves, layout and decision mode in the plugin's database.
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import sidebar from "./src/sidebar/server";

export default async function plugin(bb: BbPluginApi) {
  sidebar(bb);
  bb.log.info("Polish loaded");
}

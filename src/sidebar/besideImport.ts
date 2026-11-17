// Bring Beside's state over. Polish's sidebar is Beside moved in, and both keep
// the same tables, so Polish can copy Beside's shelves, layout, settings,
// decision log and decision keys from the database that sits beside its own.
// Beside's database is only read.
import { chmodSync, copyFileSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";

interface Statement {
  run(...values: unknown[]): unknown;
  all(...values: unknown[]): unknown[];
}

export interface ImportDatabase {
  readonly name?: string;
  exec(sql: string): unknown;
  prepare(sql: string): Statement;
}

const TABLES: Record<string, readonly string[]> = {
  thread_lifecycle: [
    "thread_id",
    "settled_at",
    "snoozed_until",
    "snoozed_at",
    "muted_at",
    "push_level_before_mute",
    "quiet_through",
    "judged_through",
  ],
  layout_sets: ["set_name", "items"],
  settings: ["key", "value"],
  decisions: [
    "thread_id",
    "attention_at",
    "quiet",
    "reason",
    "answers",
    "model",
    "decided_at",
    "title",
    "provider",
  ],
};

const KEYS_FILE = "decision-keys.json";

/** Beside's database, when Beside is installed on this bb. */
export function besideDatabasePath(ownPath: string | undefined): string | null {
  if (!ownPath || ownPath === ":memory:") return null;
  const path = join(dirname(dirname(ownPath)), "beside", basename(ownPath));
  return path !== ownPath && existsSync(path) ? path : null;
}

/**
 * Replace Polish's sidebar state with Beside's. Returns how many threads sit
 * on a shelf afterwards, or null when there is no Beside to read.
 */
export function importFromBeside(db: ImportDatabase): { threads: number } | null {
  const source = besideDatabasePath(db.name);
  if (source === null || db.name === undefined) return null;
  db.prepare(`ATTACH DATABASE ? AS beside`).run(source);
  try {
    db.exec("BEGIN");
    try {
      for (const [table, columns] of Object.entries(TABLES)) {
        const present = new Set(
          (db.prepare(`PRAGMA beside.table_info(${table})`).all() as { name: string }[]).map(
            (column) => column.name,
          ),
        );
        const shared = columns.filter((column) => present.has(column));
        if (shared.length === 0) continue;
        const list = shared.join(", ");
        db.exec(`DELETE FROM main.${table}`);
        db.exec(
          `INSERT INTO main.${table} (${list}) SELECT ${list} FROM beside.${table}`,
        );
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  } finally {
    db.exec("DETACH DATABASE beside");
  }

  const keys = join(dirname(source), KEYS_FILE);
  if (existsSync(keys)) {
    const target = join(dirname(db.name), KEYS_FILE);
    copyFileSync(keys, target);
    chmodSync(target, 0o600);
  }

  const [count] = db
    .prepare(`SELECT COUNT(*) AS threads FROM thread_lifecycle`)
    .all() as { threads: number }[];
  return { threads: count?.threads ?? 0 };
}

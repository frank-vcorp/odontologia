import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "./schema";

export type DbClient = PostgresJsDatabase<typeof schema>;

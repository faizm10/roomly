import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/lib/db/schema";

let database: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  if (!database) {
    database = drizzle(neon(connectionString), { schema });
  }
  return database;
}

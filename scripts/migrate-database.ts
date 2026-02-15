#!/usr/bin/env tsx

/**
 * Database Migration Script
 *
 * This script helps you backup and restore your PostgreSQL database.
 *
 * Usage:
 *   npm run db:backup              - Create a backup of current database
 *   npm run db:restore <file>      - Restore from a backup file
 *   npm run db:migrate-to <url>    - Migrate directly to another database
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

// Get the project root directory (parent of scripts/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");

// Load environment variables from .env file in project root
config({ path: join(projectRoot, ".env") });

const BACKUP_DIR = join(process.cwd(), "backups");

// Ensure backup directory exists
if (!existsSync(BACKUP_DIR)) {
  mkdirSync(BACKUP_DIR, { recursive: true });
}

function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").split("T")[0] + "_" +
         new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
}

function exec(command: string, description: string) {
  console.log(`\n🔄 ${description}...`);
  try {
    execSync(command, { stdio: "inherit" });
    console.log(`✅ ${description} completed`);
  } catch (error) {
    console.error(`❌ ${description} failed`);
    throw error;
  }
}

async function backupDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL not found in environment variables");
    console.log("Please set DATABASE_URL in your .env file");
    process.exit(1);
  }

  const timestamp = getTimestamp();
  const backupFile = join(BACKUP_DIR, `backup-${timestamp}.sql`);

  console.log("\n📦 Starting database backup...");
  console.log(`📍 Source: ${databaseUrl.replace(/:[^:@]*@/, ':****@')}`);
  console.log(`📁 Backup file: ${backupFile}`);

  exec(
    `pg_dump "${databaseUrl}" > "${backupFile}"`,
    "Creating database backup"
  );

  // Get backup file size
  const { size } = require("fs").statSync(backupFile);
  const sizeMB = (size / 1024 / 1024).toFixed(2);

  console.log(`\n✨ Backup completed successfully!`);
  console.log(`📊 Backup size: ${sizeMB} MB`);
  console.log(`📁 Location: ${backupFile}`);

  return backupFile;
}

async function restoreDatabase(backupFile: string) {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL not found in environment variables");
    process.exit(1);
  }

  if (!existsSync(backupFile)) {
    console.error(`❌ Backup file not found: ${backupFile}`);
    process.exit(1);
  }

  console.log("\n🔄 Starting database restore...");
  console.log(`📁 Backup file: ${backupFile}`);
  console.log(`📍 Target: ${databaseUrl.replace(/:[^:@]*@/, ':****@')}`);

  console.log("\n⚠️  WARNING: This will overwrite the target database!");
  console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...");

  await new Promise(resolve => setTimeout(resolve, 5000));

  exec(
    `psql "${databaseUrl}" < "${backupFile}"`,
    "Restoring database"
  );

  console.log("\n✨ Database restored successfully!");
}

async function migrateDirect(targetUrl: string) {
  const sourceUrl = process.env.DATABASE_URL;

  if (!sourceUrl) {
    console.error("❌ DATABASE_URL not found in environment variables");
    process.exit(1);
  }

  console.log("\n🔄 Starting direct database migration...");
  console.log(`📍 Source: ${sourceUrl.replace(/:[^:@]*@/, ':****@')}`);
  console.log(`📍 Target: ${targetUrl.replace(/:[^:@]*@/, ':****@')}`);

  console.log("\n⚠️  WARNING: This will overwrite the target database!");
  console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...");

  await new Promise(resolve => setTimeout(resolve, 5000));

  exec(
    `pg_dump "${sourceUrl}" | psql "${targetUrl}"`,
    "Migrating database"
  );

  console.log("\n✨ Migration completed successfully!");
}

async function verifyDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL not found in environment variables");
    process.exit(1);
  }

  console.log("\n🔍 Verifying database...");

  const query = `
    SELECT
      (SELECT COUNT(*) FROM users) as users,
      (SELECT COUNT(*) FROM expenses) as expenses,
      (SELECT COUNT(*) FROM incomes) as incomes,
      (SELECT COUNT(*) FROM budgets) as budgets,
      (SELECT COUNT(*) FROM goals) as goals,
      (SELECT COUNT(*) FROM monthly_summaries) as summaries;
  `;

  exec(
    `psql "${databaseUrl}" -c "${query}"`,
    "Fetching table counts"
  );
}

// Main execution
const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  console.log("\n🗄️  Database Migration Tool\n");

  switch (command) {
    case "backup":
      await backupDatabase();
      break;

    case "restore":
      if (!arg) {
        console.error("❌ Please provide backup file path");
        console.log("Usage: npm run db:restore <backup-file>");
        process.exit(1);
      }
      await restoreDatabase(arg);
      break;

    case "migrate":
      if (!arg) {
        console.error("❌ Please provide target database URL");
        console.log("Usage: npm run db:migrate-to <database-url>");
        process.exit(1);
      }
      await migrateDirect(arg);
      break;

    case "verify":
      await verifyDatabase();
      break;

    default:
      console.log("Available commands:");
      console.log("  backup           - Create a backup of current database");
      console.log("  restore <file>   - Restore from a backup file");
      console.log("  migrate <url>    - Migrate directly to another database");
      console.log("  verify           - Verify database and show table counts");
      console.log("\nExamples:");
      console.log("  npm run db:backup");
      console.log("  npm run db:restore backups/backup-2026-02-15_11-30-00.sql");
      console.log("  npm run db:migrate postgresql://user:pass@new-host:5432/dbname");
      console.log("  npm run db:verify");
  }
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});

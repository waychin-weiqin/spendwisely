# Database Migration Guide

This guide will help you backup and migrate your PostgreSQL database between different machines or environments.

## Prerequisites

- PostgreSQL client tools (`pg_dump` and `psql`) must be installed
- Access to both source and target databases
- DATABASE_URL configured in your `.env` file

## Quick Start

### 1. Backup Your Current Database

Create a backup of your database:

```bash
npm run db:backup
```

This creates a timestamped backup file in the `backups/` directory, e.g., `backups/backup-2026-02-15_11-30-00.sql`

### 2. Restore from Backup

To restore a backup to your current database:

```bash
npm run db:restore backups/backup-2026-02-15_11-30-00.sql
```

⚠️ **Warning:** This will overwrite your current database!

### 3. Direct Migration to Another Database

To migrate directly from your current database to a new one:

```bash
npm run db:migrate-to postgresql://user:password@new-host:5432/dbname
```

### 4. Verify Database

Check table counts to verify your migration:

```bash
npm run db:verify
```

## Step-by-Step Migration Example

### Scenario: Moving from DigitalOcean to AWS

**On DigitalOcean (source):**

1. Create a backup:
   ```bash
   npm run db:backup
   ```

2. Download the backup file to your local machine:
   ```bash
   # The backup is in: backups/backup-2026-02-15_11-30-00.sql
   # Copy it to your local machine or new server
   scp backups/backup-2026-02-15_11-30-00.sql your-local-machine:/path/to/backup/
   ```

**On AWS (target):**

1. Set up PostgreSQL on the new machine

2. Update `.env` with the new database URL:
   ```bash
   DATABASE_URL=postgresql://user:password@aws-host:5432/dbname
   ```

3. Restore the backup:
   ```bash
   npm run db:restore /path/to/backup/backup-2026-02-15_11-30-00.sql
   ```

4. Verify the migration:
   ```bash
   npm run db:verify
   ```

5. Run any pending migrations:
   ```bash
   npm run db:push
   ```

## Alternative: Direct Migration (Both Databases Accessible)

If both databases are accessible from your machine:

1. Backup current database first (safety):
   ```bash
   npm run db:backup
   ```

2. Migrate directly:
   ```bash
   npm run db:migrate-to postgresql://user:pass@new-host:5432/dbname
   ```

3. Update your `.env` file:
   ```bash
   # Old
   DATABASE_URL=postgresql://old-host/dbname

   # New
   DATABASE_URL=postgresql://new-host/dbname
   ```

4. Verify:
   ```bash
   npm run db:verify
   ```

## Manual Migration (if scripts don't work)

### Backup:
```bash
pg_dump $DATABASE_URL > backup.sql
```

### Restore:
```bash
psql $NEW_DATABASE_URL < backup.sql
```

## Troubleshooting

### "pg_dump: command not found"

Install PostgreSQL client tools:

**macOS:**
```bash
brew install postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql-client
```

**Windows:**
Download from [postgresql.org](https://www.postgresql.org/download/windows/)

### "Database does not exist"

Create the database first:
```bash
createdb your_database_name
# or
psql -c "CREATE DATABASE your_database_name;"
```

### "Permission denied"

Make sure your database user has the correct permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE your_database_name TO your_user;
```

## Important Notes

1. **Always backup before restoring** - The restore operation will overwrite your database
2. **Check table counts** - Use `npm run db:verify` to compare source and target
3. **Update environment variables** - Don't forget to update `DATABASE_URL` in `.env`
4. **Test the application** - Verify all features work after migration
5. **Backup regularly** - Schedule regular backups for production databases

## Automated Backups

For production, consider setting up automated daily backups:

```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * cd /path/to/app && npm run db:backup
```

## Migration Checklist

- [ ] Backup current database
- [ ] Set up PostgreSQL on new machine
- [ ] Create new database
- [ ] Restore backup to new database
- [ ] Update `DATABASE_URL` in `.env`
- [ ] Run `npm run db:push` to apply any pending migrations
- [ ] Verify with `npm run db:verify`
- [ ] Test application thoroughly
- [ ] Update DNS/routing to point to new server
- [ ] Monitor logs for any issues

## Support

If you encounter issues:
1. Check the logs for detailed error messages
2. Verify database connection strings
3. Ensure PostgreSQL client tools are installed
4. Check file permissions for backup files

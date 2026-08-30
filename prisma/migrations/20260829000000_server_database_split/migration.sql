-- Split the flat SavedConnection table into SavedServer (host/credentials)
-- and SavedDatabase (one row per database under a server).

-- CreateTable
CREATE TABLE "SavedServer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 5432,
    "databaseUser" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "ssl" BOOLEAN NOT NULL DEFAULT false,
    "connectionString" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedDatabase" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedDatabase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedServer_userId_idx" ON "SavedServer"("userId");

-- CreateIndex
CREATE INDEX "SavedDatabase_serverId_idx" ON "SavedDatabase"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedDatabase_serverId_name_key" ON "SavedDatabase"("serverId", "name");

-- AddForeignKey
ALTER TABLE "SavedServer" ADD CONSTRAINT "SavedServer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedDatabase" ADD CONSTRAINT "SavedDatabase_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "SavedServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: fold existing SavedConnection rows into servers + databases.
-- Rows that share the same user + host + port + credentials + ssl + URL collapse
-- into one server; each contributes its database name.
WITH grouped AS (
    SELECT
        gen_random_uuid()::text AS server_id,
        "userId",
        "host",
        "port",
        "databaseUser",
        "password",
        "ssl",
        "connectionString",
        MIN("name")      AS server_name,
        MIN("createdAt") AS created_at,
        MAX("updatedAt") AS updated_at
    FROM "SavedConnection"
    GROUP BY
        "userId", "host", "port", "databaseUser", "password", "ssl", "connectionString"
),
inserted_servers AS (
    INSERT INTO "SavedServer"
        ("id", "userId", "name", "host", "port", "databaseUser", "password", "ssl", "connectionString", "createdAt", "updatedAt")
    SELECT
        server_id, "userId", server_name, "host", "port", "databaseUser", "password", "ssl", "connectionString", created_at, updated_at
    FROM grouped
    RETURNING "id", "userId", "host", "port", "databaseUser", "password", "ssl", "connectionString"
)
INSERT INTO "SavedDatabase" ("id", "serverId", "name", "createdAt")
SELECT
    gen_random_uuid()::text,
    s."id",
    c."database",
    c."createdAt"
FROM "SavedConnection" c
JOIN inserted_servers s
  ON  s."userId" = c."userId"
  AND s."host" = c."host"
  AND s."port" = c."port"
  AND s."databaseUser" = c."databaseUser"
  AND s."password" = c."password"
  AND s."ssl" = c."ssl"
  AND s."connectionString" IS NOT DISTINCT FROM c."connectionString"
WHERE COALESCE(c."database", '') <> ''
ON CONFLICT ("serverId", "name") DO NOTHING;

-- DropForeignKey
ALTER TABLE "SavedConnection" DROP CONSTRAINT "SavedConnection_userId_fkey";

-- DropTable
DROP TABLE "SavedConnection";

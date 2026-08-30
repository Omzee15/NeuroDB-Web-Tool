import { defineConfig, env } from "prisma/config";

// The Next.js app loads .env automatically. For the Prisma CLI, run commands with
// Node's built-in env-file support, e.g.:
//   node --env-file=.env node_modules/prisma/build/index.js migrate dev
// or `pnpm dlx dotenv-cli -- npx prisma ...`.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});

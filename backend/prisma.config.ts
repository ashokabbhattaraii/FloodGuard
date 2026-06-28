import "dotenv/config";
import { defineConfig } from "prisma/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

let connectionString = process.env["DATABASE_URL"] || "";
const isRDS = connectionString.includes('rds.amazonaws.com');

// Remove sslmode parameter from connection string if using RDS
// We'll set SSL options separately
if (isRDS) {
  connectionString = connectionString
    .replace(/[&?]sslmode=require/g, '')
    .replace(/[&?]sslmode=verify-full/g, '');
}

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // For AWS RDS, accept self-signed certificates
  ssl: isRDS ? {
    rejectUnauthorized: false
  } : false,
});

export const adapter = new PrismaPg(pool);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});

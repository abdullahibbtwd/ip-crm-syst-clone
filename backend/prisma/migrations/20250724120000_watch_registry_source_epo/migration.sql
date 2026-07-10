-- AlterEnum: add EPO as a watch registry source for OPS-backed alerts
ALTER TYPE "watch_registry_source" ADD VALUE IF NOT EXISTS 'EPO';

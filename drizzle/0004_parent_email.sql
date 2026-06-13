-- Migration: add parent_email column to parents table
-- This is a backward-compatible change (nullable column, no default required)
ALTER TABLE `parents` ADD COLUMN `parent_email` varchar(256);

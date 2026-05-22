-- Migration 002 — license_label para descrição personalizada de "Outros"
-- Compatível com MySQL 8.0 — idempotente (ignora se a coluna já existir)

SET @db = DATABASE();

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'rs_company_licenses' AND COLUMN_NAME = 'license_label');
SET @sql = IF(@col = 0,
  'ALTER TABLE rs_company_licenses ADD COLUMN license_label VARCHAR(100) NULL AFTER license_type',
  'SELECT "license_label already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

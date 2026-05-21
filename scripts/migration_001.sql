-- Migration 001 — Localização (cidade/UF) + expiration_date_text
-- Compatível com MySQL 8.0

-- Adiciona cidade e uf em rs_companies (ignora se já existir)
SET @db = DATABASE();

SET @col1 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'rs_companies' AND COLUMN_NAME = 'cidade');
SET @sql1 = IF(@col1 = 0,
  'ALTER TABLE rs_companies ADD COLUMN cidade VARCHAR(150) NULL AFTER cnpj',
  'SELECT "cidade already exists"');
PREPARE stmt FROM @sql1; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col2 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'rs_companies' AND COLUMN_NAME = 'uf');
SET @sql2 = IF(@col2 = 0,
  'ALTER TABLE rs_companies ADD COLUMN uf CHAR(2) NULL AFTER cidade',
  'SELECT "uf already exists"');
PREPARE stmt FROM @sql2; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col3 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'rs_company_licenses' AND COLUMN_NAME = 'expiration_date_text');
SET @sql3 = IF(@col3 = 0,
  'ALTER TABLE rs_company_licenses ADD COLUMN expiration_date_text VARCHAR(255) NULL AFTER expiration_date',
  'SELECT "expiration_date_text already exists"');
PREPARE stmt FROM @sql3; EXECUTE stmt; DEALLOCATE PREPARE stmt;

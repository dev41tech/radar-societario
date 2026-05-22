-- Radar Societário — Schema
-- Executa no mesmo banco do Aditiva Pronto (aditiva_pronto)
-- Todas as tabelas prefixadas com rs_

CREATE TABLE IF NOT EXISTS rs_companies (
  id VARCHAR(36) PRIMARY KEY,
  aditiva_id VARCHAR(36) NULL,
  razao_social VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) NULL,
  source ENUM('imported', 'manual') DEFAULT 'imported',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cnpj (cnpj),
  INDEX idx_active (active),
  INDEX idx_razao_social (razao_social)
);

CREATE TABLE IF NOT EXISTS rs_company_licenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id VARCHAR(36) NOT NULL,
  license_type ENUM(
    'alvara_funcionamento',
    'meio_ambiente',
    'vigilancia_sanitaria',
    'corpo_bombeiros',
    'ibama',
    'taxa_alvara_anual',
    'alvara_policia',
    'antt',
    'outros'
  ) NOT NULL,
  license_label VARCHAR(100) NULL,
  expiration_date DATE NULL,
  notes TEXT NULL,
  applicable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_company_license (company_id, license_type),
  FOREIGN KEY (company_id) REFERENCES rs_companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rs_settings (
  `key` VARCHAR(100) PRIMARY KEY,
  `value` TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rs_notification_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id VARCHAR(36) NOT NULL,
  license_type VARCHAR(50) NOT NULL,
  days_before INT NOT NULL,
  expiration_date DATE NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lookup (company_id, license_type, days_before, expiration_date)
);

CREATE TABLE IF NOT EXISTS rs_trello_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id VARCHAR(36) NOT NULL,
  license_type VARCHAR(50) NOT NULL,
  expiration_date DATE NOT NULL,
  card_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_card (company_id, license_type, expiration_date)
);

INSERT IGNORE INTO rs_settings (`key`, `value`) VALUES
  ('smtp_host', ''),
  ('smtp_port', '587'),
  ('smtp_user', ''),
  ('smtp_pass', ''),
  ('smtp_from', ''),
  ('smtp_secure', 'false'),
  ('notification_days', '[90, 60, 30]'),
  ('notification_emails', '[]'),
  ('notification_enabled', 'true'),
  ('notification_hour', '8'),
  ('trello_api_key', ''),
  ('trello_token', ''),
  ('trello_board_id', ''),
  ('trello_list_id', ''),
  ('trello_enabled', 'false');

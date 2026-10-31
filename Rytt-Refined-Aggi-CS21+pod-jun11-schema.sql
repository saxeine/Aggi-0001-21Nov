-- Rytt-Refined-Aggi-CS21+pod-jun11 Local Database Schema
-- Optimized for WAMP Server (Apache, MySQL/MariaDB, PHP)
-- Compatible with MySQL 5.7+ and MariaDB 10.3+
-- Author: Google AI Studio Coding Agent

-- -------------------------------------------------------------
-- 1. Database Initialization
-- -------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS `Rytt-Refined-Aggi-CS21+pod-jun11`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `Rytt-Refined-Aggi-CS21+pod-jun11`;

-- -------------------------------------------------------------
-- 2. Sessions Table (Research Sessions and Podcast Generator Logs)
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` VARCHAR(128) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `created_at` BIGINT NOT NULL COMMENT 'Unix timestamp in milliseconds',
  `media_items` LONGTEXT DEFAULT NULL COMMENT 'JSON array of linked media/source documents',
  `selected_media_ids` TEXT DEFAULT NULL COMMENT 'JSON array of selected document IDs',
  `history` LONGTEXT DEFAULT NULL COMMENT 'JSON array representing conversational messages and logs',
  `suggestions` TEXT DEFAULT NULL COMMENT 'JSON array of suggested prompt queries',
  `gemini_cache_name` VARCHAR(255) DEFAULT NULL,
  `gemini_cache_hash` VARCHAR(255) DEFAULT NULL,
  `mind_map_data` LONGTEXT DEFAULT NULL COMMENT 'JSON representation of generated knowledge graphs',
  PRIMARY KEY (`id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- 3. Crypto Portfolio Holdings Table
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `crypto_holdings` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `user_id` VARCHAR(128) DEFAULT 'anonymous_user' COMMENT 'Supports multi-user authentication mapping',
  `coin_id` VARCHAR(100) NOT NULL COMMENT 'CoinGecko slug e.g., bitcoin, ripple, ethereum',
  `coin_symbol` VARCHAR(30) NOT NULL COMMENT 'Symbol e.g., BTC, XRP, ETH',
  `coin_name` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(24, 8) NOT NULL COMMENT 'Amount of coin held',
  `buy_price_usd` DECIMAL(16, 4) NOT NULL COMMENT 'Original purchase price in USD',
  `buy_price_sek` DECIMAL(16, 4) DEFAULT NULL COMMENT 'Cached buy price in Swedish Krona',
  `added_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_crypto_user` (`user_id`),
  INDEX `idx_coin_id` (`coin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- 4. Stock Portfolio Holdings Table (Nasdaq 500 Equities Terminal)
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `stock_holdings` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `user_id` VARCHAR(128) DEFAULT 'anonymous_user',
  `symbol` VARCHAR(20) NOT NULL COMMENT 'Ticker symbol e.g., AAPL, MSFT, TSLA',
  `company_name` VARCHAR(200) NOT NULL,
  `amount` DECIMAL(16, 4) NOT NULL COMMENT 'Number of shares held',
  `buy_price_usd` DECIMAL(16, 4) NOT NULL COMMENT 'Original purchase price in USD',
  `buy_price_sek` DECIMAL(16, 4) DEFAULT NULL COMMENT 'Cached buy price in SEK',
  `added_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_stock_user` (`user_id`),
  INDEX `idx_stock_symbol` (`symbol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- 5. Currency / Forex Pair Holdings Table (Forex App6 Terminal)
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `forex_holdings` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `user_id` VARCHAR(128) DEFAULT 'anonymous_user',
  `pair` VARCHAR(20) NOT NULL COMMENT 'Currency Pair abbreviation e.g., EUR/USD, USD/SEK',
  `base_currency` VARCHAR(10) NOT NULL COMMENT 'First currency e.g., EUR',
  `quote_currency` VARCHAR(10) NOT NULL COMMENT 'Second currency e.g., USD',
  `position_size` DECIMAL(16, 2) NOT NULL COMMENT 'Lot or position unit size (e.g. 10000, 50.50)',
  `entry_price` DECIMAL(16, 6) NOT NULL COMMENT 'Forex entry price',
  `added_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_forex_user` (`user_id`),
  INDEX `idx_forex_pair` (`pair`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- 6. Application Settings Table
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `app_settings` (
  `setting_key` VARCHAR(100) NOT NULL,
  `user_id` VARCHAR(128) DEFAULT 'anonymous_user',
  `setting_value` LONGTEXT NOT NULL COMMENT 'Value or JSON configuration string',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -------------------------------------------------------------
-- 7. Initial High-Performance Seed Data for Local Onboarding
-- -------------------------------------------------------------

-- Default app config settings
INSERT INTO `app_settings` (`setting_key`, `user_id`, `setting_value`) VALUES
('win_target_settings', 'anonymous_user', '{"winTarget":10000,"winCurrency":"SEK"}'),
('crypto_custom_coins_list', 'anonymous_user', '[]'),
('stock_custom_tickets_list', 'anonymous_user', '["AAPL","MSFT","NVDA","AMZN","GOOGL"]'),
('forex_custom_pairs_list', 'anonymous_user', '["EUR/USD","GBP/USD","USD/JPY","USD/SEK","EUR/SEK"]')
ON DUPLICATE KEY UPDATE `setting_key` = `setting_key`;

-- Default Crypto portfolio assets (Bitcoin, Ethereum, Solana)
INSERT INTO `crypto_holdings` (`coin_id`, `coin_symbol`, `coin_name`, `amount`, `buy_price_usd`, `buy_price_sek`) VALUES
('bitcoin', 'BTC', 'Bitcoin', 0.25000000, 62000.0000, 660300.0000),
('ethereum', 'ETH', 'Ethereum', 1.80000000, 3100.0000, 33015.0000),
('solana', 'SOL', 'Solana', 15.00000000, 130.0000, 1384.5000)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- Default Stock portfolio assets (Apple, Microsoft, Tesla)
INSERT INTO `stock_holdings` (`symbol`, `company_name`, `amount`, `buy_price_usd`, `buy_price_sek`) VALUES
('AAPL', 'Apple Inc.', 30.0000, 185.5000, 1975.5750),
('MSFT', 'Microsoft Corporation', 12.0000, 420.2500, 4475.6625),
('NVDA', 'NVIDIA Corporation', 50.0000, 120.1000, 1279.0650)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- Default Currency pair positions (USD/SEK, EUR/USD)
INSERT INTO `forex_holdings` (`pair`, `base_currency`, `quote_currency`, `position_size`, `entry_price`) VALUES
('USD/SEK', 'USD', 'SEK', 2500.00, 10.450000),
('EUR/USD', 'EUR', 'USD', 5000.00, 1.085000)
ON DUPLICATE KEY UPDATE `id` = `id`;


-- -------------------------------------------------------------
-- Instructions for importing into WAMP Server:
-- -------------------------------------------------------------
-- 1. Open http://localhost/phpmyadmin in your browser.
-- 2. Go to the "Import" tab at the top.
-- 3. Click "Browse..." and select this file.
-- 4. Click "Go" at the bottom right.
-- 5. The database and all structure schemas will compile successfully.
-- -------------------------------------------------------------

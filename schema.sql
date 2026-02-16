-- ===========================================================
-- Database for BloodConnect
-- ===========================================================

CREATE DATABASE IF NOT EXISTS bloodconnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bloodconnect;

-- ===========================================================
-- DONORS TABLE  (existing + added features)
-- ===========================================================

CREATE TABLE IF NOT EXISTS donors (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Existing fields
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  blood_group VARCHAR(10) NOT NULL,
  city VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- ----------------------------------------
  -- NEW FIELDS FOR ADDED FEATURES
  -- ----------------------------------------

  -- Eligibility fields
  age INT,
  last_donation_date DATE,
  hemoglobin FLOAT,
  eligible BOOLEAN DEFAULT TRUE,

  -- Rewards & gamification
  points INT DEFAULT 0,
  donation_count INT DEFAULT 0,
  badge VARCHAR(30) DEFAULT 'Helper',

  -- QR support
  qr_hash VARCHAR(255),

  -- Location support
  address TEXT,
  state VARCHAR(100),
  pincode VARCHAR(20),
  country VARCHAR(100),
  latitude DECIMAL(10,6),
  longitude DECIMAL(10,6)
) ENGINE=InnoDB;

-- ===========================================================
-- REQUESTS TABLE (existing — unchanged)
-- ===========================================================

CREATE TABLE IF NOT EXISTS requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  donor_id INT NOT NULL,
  requester_name VARCHAR(255) NOT NULL,
  requester_phone VARCHAR(50),
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ===========================================================
-- OTP TABLE (NEW — for request verification)
-- ===========================================================

CREATE TABLE IF NOT EXISTS request_otp (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  otp INT NOT NULL,
  expires_at DATETIME NOT NULL,
  verified BOOLEAN DEFAULT FALSE
) ENGINE=InnoDB;

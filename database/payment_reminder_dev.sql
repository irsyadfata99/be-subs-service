-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Oct 01, 2025 at 06:38 AM
-- Server version: 10.11.11-MariaDB-log
-- PHP Version: 8.3.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `payment_reminder_dev`
--

-- --------------------------------------------------------

--
-- Table structure for table `clients`
--

CREATE TABLE `clients` (
  `id` int(11) NOT NULL,
  `business_name` varchar(255) NOT NULL,
  `business_type` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `logo_url` text DEFAULT NULL,
  `status` enum('trial','active','overdue','suspended') DEFAULT 'trial',
  `role` enum('client','admin','super_admin') NOT NULL DEFAULT 'client',
  `trial_ends_at` datetime DEFAULT NULL,
  `total_users` int(11) DEFAULT 0,
  `monthly_bill` decimal(10,2) DEFAULT 0.00,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `contact_whatsapp` varchar(20) DEFAULT NULL COMMENT 'WhatsApp number for client contact (display only, not for sending)',
  `billing_date` int(11) NOT NULL DEFAULT 1 COMMENT 'Day of month for billing (1-31)',
  `last_active_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `clients`
--

INSERT INTO `clients` (`id`, `business_name`, `business_type`, `email`, `password`, `phone`, `logo_url`, `status`, `role`, `trial_ends_at`, `total_users`, `monthly_bill`, `created_at`, `updated_at`, `contact_whatsapp`, `billing_date`, `last_active_at`) VALUES
(15, 'Platform Admin', 'System', 'superadmin@platform.com', '$2b$10$a/e/BB24oho4RKfu9wmWH.J99WC.f6DYm6NAxuRQdstfd0NWbmHVm', '628123456789', NULL, 'active', 'super_admin', NULL, 0, '0.00', '2025-09-30 13:53:31', '2025-09-30 15:58:26', '6281318465501', 1, '2025-09-30 15:58:26'),
(16, 'Support Team', 'Internal', 'admin@platform.com', '$2b$10$a/e/BB24oho4RKfu9wmWH.J99WC.f6DYm6NAxuRQdstfd0NWbmHVm', '628123456790', NULL, 'active', 'admin', NULL, 0, '0.00', '2025-09-30 13:53:50', '2025-09-30 15:50:28', '6281318465501', 1, '2025-09-30 15:50:28'),
(20, 'test', 'test', 'test@test.com', '$2b$10$S2b3cwvNeqZwL.Bk/kY7l.6xwPTpjzrWUjznfkFl5tVp1XrGu65La', '6281231258159', NULL, 'trial', 'client', '2025-12-30 09:07:32', 0, '0.00', '2025-10-01 09:07:32', '2025-10-01 09:07:32', '6281318465501', 1, '2025-10-01 09:07:32');

-- --------------------------------------------------------

--
-- Table structure for table `cron_job_logs`
--

CREATE TABLE `cron_job_logs` (
  `id` int(11) NOT NULL,
  `job_name` varchar(100) NOT NULL COMMENT 'Name of the cron job',
  `status` enum('success','warning','failed') NOT NULL,
  `duration_ms` int(11) DEFAULT NULL COMMENT 'Execution duration in milliseconds',
  `records_processed` int(11) DEFAULT 0 COMMENT 'Number of records processed',
  `records_success` int(11) DEFAULT 0,
  `records_failed` int(11) DEFAULT 0,
  `error_message` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional job execution details' CHECK (json_valid(`metadata`)),
  `started_at` datetime NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `end_users`
--

CREATE TABLE `end_users` (
  `id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `package_name` varchar(255) NOT NULL,
  `package_price` decimal(10,2) NOT NULL,
  `billing_cycle` varchar(50) DEFAULT 'monthly',
  `due_date` date NOT NULL,
  `status` enum('active','overdue','inactive') DEFAULT 'active',
  `last_reminder_sent` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `payment_date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `error_logs`
--

CREATE TABLE `error_logs` (
  `id` int(11) NOT NULL,
  `level` enum('error','warning','info') NOT NULL DEFAULT 'error',
  `service` varchar(100) NOT NULL COMMENT 'Service name (e.g., cronService, billingService)',
  `message` text NOT NULL,
  `stack_trace` text DEFAULT NULL,
  `client_id` int(11) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Additional error context' CHECK (json_valid(`metadata`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `platform_invoices`
--

CREATE TABLE `platform_invoices` (
  `id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `period_month` int(11) NOT NULL,
  `period_year` int(11) NOT NULL,
  `total_users` int(11) NOT NULL,
  `price_per_user` decimal(10,2) DEFAULT 3000.00,
  `total_amount` decimal(10,2) NOT NULL,
  `due_date` date NOT NULL,
  `status` enum('pending','paid','overdue','expired','cancelled') DEFAULT 'pending',
  `tripay_reference` varchar(100) DEFAULT NULL,
  `tripay_merchant_ref` varchar(100) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `payment_method_selected` enum('BCA_VA','QRIS') DEFAULT NULL,
  `checkout_url` text DEFAULT NULL,
  `qr_url` text DEFAULT NULL,
  `qr_string` text DEFAULT NULL,
  `pay_code` varchar(100) DEFAULT NULL,
  `total_fee` decimal(10,2) DEFAULT NULL,
  `amount_received` decimal(10,2) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `expired_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `platform_settings`
--

CREATE TABLE `platform_settings` (
  `id` int(11) NOT NULL,
  `key` varchar(100) NOT NULL,
  `value` text NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `platform_settings`
--

INSERT INTO `platform_settings` (`id`, `key`, `value`, `description`, `created_at`, `updated_at`) VALUES
(1, 'price_per_user', '3000', 'Platform fee per user per month (IDR)', '2025-09-27 11:36:01', '2025-09-27 11:36:01');

-- --------------------------------------------------------

--
-- Table structure for table `pricing_adjustments`
--

CREATE TABLE `pricing_adjustments` (
  `id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `old_price` decimal(10,2) NOT NULL,
  `new_price` decimal(10,2) NOT NULL,
  `reason` text DEFAULT NULL,
  `adjusted_by` int(11) NOT NULL COMMENT 'super_admin client_id who made the adjustment',
  `adjusted_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reminders`
--

CREATE TABLE `reminders` (
  `id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `end_user_id` int(11) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `message` text NOT NULL,
  `type` enum('before_3days','before_1day','overdue') NOT NULL,
  `status` enum('sent','failed') NOT NULL,
  `response` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`response`)),
  `sent_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sequelizemeta`
--

CREATE TABLE `sequelizemeta` (
  `name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

--
-- Dumping data for table `sequelizemeta`
--

INSERT INTO `sequelizemeta` (`name`) VALUES
('20250101000001-add-role-system.js'),
('20250101000002-add-qris-payment.js'),
('20250101000003-create-pricing-adjustments.js'),
('20250101000004-create-error-logs.js'),
('20250101000005-create-cron-job-logs.js'),
('20250926112746-create-clients-table.js'),
('20250926112755-create-end-users-table.js'),
('20250926112810-create-reminders-table.js'),
('20250926112823-create-platform-invoices-table.js'),
('20250927000000-create-platform-settings-table.js'),
('20250927093934-add-payment-date-to-end-users.js'),
('20250929000001-add-contact-whatsapp-to-clients.js'),
('20250930000000-add-billing-date.js'),
('20250930000001-update-client-status-enum.js');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `cron_job_logs`
--
ALTER TABLE `cron_job_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cron_job_logs_job_name` (`job_name`),
  ADD KEY `cron_job_logs_status` (`status`),
  ADD KEY `cron_job_logs_started_at` (`started_at`);

--
-- Indexes for table `end_users`
--
ALTER TABLE `end_users`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_client_status` (`client_id`,`status`),
  ADD KEY `idx_due_date` (`due_date`);

--
-- Indexes for table `error_logs`
--
ALTER TABLE `error_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `error_logs_level` (`level`),
  ADD KEY `error_logs_service` (`service`),
  ADD KEY `error_logs_client_id` (`client_id`),
  ADD KEY `error_logs_created_at` (`created_at`);

--
-- Indexes for table `platform_invoices`
--
ALTER TABLE `platform_invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invoice_number` (`invoice_number`),
  ADD KEY `idx_client_status` (`client_id`,`status`),
  ADD KEY `idx_tripay_ref` (`tripay_merchant_ref`);

--
-- Indexes for table `platform_settings`
--
ALTER TABLE `platform_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `key` (`key`);

--
-- Indexes for table `pricing_adjustments`
--
ALTER TABLE `pricing_adjustments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `pricing_adjustments_client_id` (`client_id`);

--
-- Indexes for table `reminders`
--
ALTER TABLE `reminders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `end_user_id` (`end_user_id`),
  ADD KEY `idx_client_date` (`client_id`,`created_at`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `sequelizemeta`
--
ALTER TABLE `sequelizemeta`
  ADD PRIMARY KEY (`name`),
  ADD UNIQUE KEY `name` (`name`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `clients`
--
ALTER TABLE `clients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `cron_job_logs`
--
ALTER TABLE `cron_job_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `end_users`
--
ALTER TABLE `end_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=177;

--
-- AUTO_INCREMENT for table `error_logs`
--
ALTER TABLE `error_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `platform_invoices`
--
ALTER TABLE `platform_invoices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `platform_settings`
--
ALTER TABLE `platform_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `pricing_adjustments`
--
ALTER TABLE `pricing_adjustments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reminders`
--
ALTER TABLE `reminders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `end_users`
--
ALTER TABLE `end_users`
  ADD CONSTRAINT `end_users_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `error_logs`
--
ALTER TABLE `error_logs`
  ADD CONSTRAINT `error_logs_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `platform_invoices`
--
ALTER TABLE `platform_invoices`
  ADD CONSTRAINT `platform_invoices_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `pricing_adjustments`
--
ALTER TABLE `pricing_adjustments`
  ADD CONSTRAINT `pricing_adjustments_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `reminders`
--
ALTER TABLE `reminders`
  ADD CONSTRAINT `reminders_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `reminders_ibfk_2` FOREIGN KEY (`end_user_id`) REFERENCES `end_users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

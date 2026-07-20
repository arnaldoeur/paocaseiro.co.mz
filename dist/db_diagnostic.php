<?php
// public/db_diagnostic.php
header("Content-Type: text/plain");
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/paocaseiro_db.php';

$conn = get_pdo_connection();
if (!$conn) {
    die("Failed to connect to database");
}

echo "Database connection successful!\n\n";

$statements = [
    "Check queue_tickets table" => function($conn) {
        $tableCheck = $conn->query("SHOW TABLES LIKE 'queue_tickets'")->rowCount();
        echo "queue_tickets table exists: " . ($tableCheck ? "Yes" : "No") . "\n";
    },
    "Check priority column" => function($conn) {
        $colCheck = $conn->query("SHOW COLUMNS FROM queue_tickets LIKE 'priority'")->rowCount();
        echo "priority column exists: " . ($colCheck ? "Yes" : "No") . "\n";
    },
    "Check cash_sessions table" => function($conn) {
        $sessionCheck = $conn->query("SHOW TABLES LIKE 'cash_sessions'")->rowCount();
        echo "cash_sessions table exists: " . ($sessionCheck ? "Yes" : "No") . "\n";
    },
    "Check system_settings table" => function($conn) {
        $settingsCheck = $conn->query("SHOW TABLES LIKE 'system_settings'")->rowCount();
        echo "system_settings table exists: " . ($settingsCheck ? "Yes" : "No") . "\n";
    },
    "Check ticket_customization setting" => function($conn) {
        $customCheck = $conn->query("SELECT COUNT(*) FROM system_settings WHERE `key` = 'ticket_customization'")->fetchColumn();
        echo "ticket_customization setting exists: " . $customCheck . "\n";
    },
    "Check contact_messages table" => function($conn) {
        $contactCheck = $conn->query("SHOW TABLES LIKE 'contact_messages'")->rowCount();
        echo "contact_messages table exists: " . ($contactCheck ? "Yes" : "No") . "\n";
    },
    "Check drive_folders table" => function($conn) {
        $driveFoldersCheck = $conn->query("SHOW TABLES LIKE 'drive_folders'")->rowCount();
        echo "drive_folders table exists: " . ($driveFoldersCheck ? "Yes" : "No") . "\n";
    },
    "Check drive_files table" => function($conn) {
        $driveFilesCheck = $conn->query("SHOW TABLES LIKE 'drive_files'")->rowCount();
        echo "drive_files table exists: " . ($driveFilesCheck ? "Yes" : "No") . "\n";
    },
    "Check newsletter_subscribers table" => function($conn) {
        $newsletterCheck = $conn->query("SHOW TABLES LIKE 'newsletter_subscribers'")->rowCount();
        echo "newsletter_subscribers table exists: " . ($newsletterCheck ? "Yes" : "No") . "\n";
    },
    "Check email_campaigns table" => function($conn) {
        $campaignCheck = $conn->query("SHOW TABLES LIKE 'email_campaigns'")->rowCount();
        echo "email_campaigns table exists: " . ($campaignCheck ? "Yes" : "No") . "\n";
    },
    "Query system_settings contents" => function($conn) {
        $stmt = $conn->query("SELECT `key`, LENGTH(`value`) as len FROM system_settings");
        echo "system_settings keys:\n";
        while ($row = $stmt->fetch()) {
            echo " - '" . $row['key'] . "' (length: " . $row['len'] . ")\n";
        }
    }
];

foreach ($statements as $desc => $fn) {
    try {
        echo "Running: $desc...\n";
        $fn($conn);
        echo "SUCCESS\n\n";
    } catch (Exception $e) {
        echo "FAILED: " . $e->getMessage() . "\n\n";
    }
}
?>

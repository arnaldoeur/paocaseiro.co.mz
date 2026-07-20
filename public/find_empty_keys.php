<?php
// public/find_empty_keys.php
header("Content-Type: text/plain");
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/paocaseiro_db.php';

$conn = get_pdo_connection();
if (!$conn) {
    die("Failed to connect to database");
}

$tables = $conn->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);

foreach ($tables as $table) {
    echo "Scanning table: $table\n";
    try {
        // Get primary key column
        $stmt = $conn->prepare("SHOW KEYS FROM `$table` WHERE Key_name = 'PRIMARY'");
        $stmt->execute();
        $primaryKeyInfo = $stmt->fetch();
        if ($primaryKeyInfo) {
            $pk = $primaryKeyInfo['Column_name'];
            echo " - Primary key is `$pk`\n";
            
            // Check for empty string primary key
            $stmtCount = $conn->prepare("SELECT COUNT(*) FROM `$table` WHERE `$pk` = '' OR `$pk` IS NULL");
            $stmtCount->execute();
            $count = $stmtCount->fetchColumn();
            echo " - Rows with empty/null primary key: $count\n";
            
            if ($count > 0) {
                $stmtRows = $conn->prepare("SELECT * FROM `$table` WHERE `$pk` = '' OR `$pk` IS NULL LIMIT 5");
                $stmtRows->execute();
                print_r($stmtRows->fetchAll(PDO::FETCH_ASSOC));
            }
        } else {
            echo " - No primary key found!\n";
        }
    } catch (Exception $e) {
        echo " - Error scanning: " . $e->getMessage() . "\n";
    }
    echo "\n";
}
?>

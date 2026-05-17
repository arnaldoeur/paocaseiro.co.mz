<?php
// HARDCODED CREDENTIALS FROM paocaseiro_db.php
$host = "72.60.122.110";
$port = "3306";
$user = "u178468876_nazir";
$pass = "@Pcaseiro25";
$db   = "u178468876_pcaseiro";
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    echo "Connecting to $host...\n";
    $pdo = new PDO($dsn, $user, $pass, $options);
    echo "Connected to $db\n";

    // MySQL ADD COLUMN IF NOT EXISTS is not standard until 8.0.19. 
    // Using a safer approach with a catch or checking columns first.
    
    $cols = $pdo->query("DESCRIBE logistics_drivers")->fetchAll(PDO::FETCH_COLUMN);
    
    if (!in_array('password', $cols)) {
        $pdo->exec("ALTER TABLE logistics_drivers ADD COLUMN password VARCHAR(255) DEFAULT NULL");
        echo "Added 'password' column.\n";
    } else {
        echo "'password' column already exists.\n";
    }

    if (!in_array('is_first_login', $cols)) {
        $pdo->exec("ALTER TABLE logistics_drivers ADD COLUMN is_first_login TINYINT(1) DEFAULT 1");
        echo "Added 'is_first_login' column.\n";
    } else {
        echo "'is_first_login' column already exists.\n";
    }

    echo "Migration completed successfully.\n";
} catch (\PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>

<?php
try {
    $pdo = new PDO('mysql:host=localhost;dbname=u859132517_paocaseiro_db', 'u859132517_admin_pc', 'PaoCaseiro_Direct_MySQL_2026');
    echo "QUEUE_TICKETS SCHEMA:\n";
    $stmt = $pdo->query('DESCRIBE queue_tickets');
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
    
    echo "\nCONTACT_MESSAGES SCHEMA:\n";
    $stmt = $pdo->query('DESCRIBE contact_messages');
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}

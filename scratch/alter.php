<?php
$pdo = new PDO('mysql:host=72.60.122.110;dbname=u178468876_pcaseiro', 'u178468876_nazir', '@Pcaseiro25');
$pdo->exec("ALTER TABLE customers ADD COLUMN avatar_url TEXT DEFAULT NULL");
$pdo->exec("ALTER TABLE customers ADD COLUMN is_blocked TINYINT(1) DEFAULT 0");
echo "Columns added.";

<?php
$pdo = new PDO('mysql:host=72.60.122.110;dbname=u178468876_pcaseiro', 'u178468876_nazir', '@Pcaseiro25');
$stmt = $pdo->query('SELECT id, name, image FROM products LIMIT 20');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
?>

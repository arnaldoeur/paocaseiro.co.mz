<?php
// scratch/update_password.php
$host = "72.60.122.110";
$port = "3306";
$user = "u178468876_nazir";
$pass = "@Pcaseiro25";
$db   = "u178468876_pcaseiro";
try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4", $user, $pass);
    // Note: paocaseiro_db.php has logic to hash the password if it's plain text.
    // I'll set it to plain text first, and the first login will hash it.
    $stmt = $pdo->prepare("UPDATE team_members SET password = ? WHERE username = ?");
    $stmt->execute(['@Pcaseiro25', 'Nazir']);
    echo "Password updated for Nazir to @Pcaseiro25";
} catch (Exception $e) {
    echo $e->getMessage();
}

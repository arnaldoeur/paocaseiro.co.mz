<?php
// scratch/check_team.php
$host = "72.60.122.110";
$port = "3306";
$user = "u178468876_nazir";
$pass = "@Pcaseiro25";
$db   = "u178468876_pcaseiro";
try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4", $user, $pass);
    $stmt = $pdo->query("SELECT id, username, name, role, password FROM team_members");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo $e->getMessage();
}

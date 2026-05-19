<?php
// public/dump_blog.php
$host = "72.60.122.110";
$port = "3306";
$user = "u178468876_nazir";
$pass = "@Pcaseiro25";
$db   = "u178468876_pcaseiro";

try {
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 5,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ];
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4", $user, $pass, $options);
    
    $stmt = $pdo->query("SELECT id, title, slug, image_url, category FROM blog_posts");
    $posts = $stmt->fetchAll();
    
    file_put_contents(__DIR__ . '/blog_posts_dump.json', json_encode($posts, JSON_PRETTY_PRINT));
    echo "SUCCESS: Dumped " . count($posts) . " posts to blog_posts_dump.json\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}

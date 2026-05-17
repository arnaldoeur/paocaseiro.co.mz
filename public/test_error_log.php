<?php
// public/test_error_log.php
header('Content-Type: text/plain; charset=utf-8');

error_log("[PaoCaseiro Test] Forcing error log write!");

$ini_log = ini_get('error_log');
echo "ini_get('error_log') = " . $ini_log . "\n";
echo "Current __DIR__ = " . __DIR__ . "\n";

$possible_paths = [
    $ini_log,
    __DIR__ . '/' . $ini_log,
    __DIR__ . '/../' . $ini_log,
    __DIR__ . '/error_log',
    __DIR__ . '/../error_log',
    '/home/u178468876/domains/paocaseiro.co.mz/nodejs/public/error_log',
    '/home/u178468876/domains/paocaseiro.co.mz/nodejs/error_log'
];

foreach ($possible_paths as $path) {
    if (!$path) continue;
    echo "Checking $path : exists=" . (file_exists($path) ? "YES" : "NO") . ", readable=" . (is_readable($path) ? "YES" : "NO") . "\n";
    if (file_exists($path) && is_readable($path)) {
        echo "--- CONTENT OF $path ---\n";
        echo file_get_contents($path);
        echo "\n--- END ---\n";
    }
}

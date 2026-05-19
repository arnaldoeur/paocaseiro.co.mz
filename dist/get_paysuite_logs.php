<?php
// public/get_paysuite_logs.php
header('Content-Type: text/plain; charset=utf-8');

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== DIAGNOSTICS ===\n";
echo "Current directory: " . __DIR__ . "\n";
echo "PHP Error Log Path (ini): " . ini_get('error_log') . "\n";

$paths = [
    __DIR__ . '/error_log',
    __DIR__ . '/../error_log',
    '/home/u178468876/domains/paocaseiro.co.mz/nodejs/public/error_log',
    '/home/u178468876/domains/paocaseiro.co.mz/nodejs/error_log'
];

foreach ($paths as $path) {
    echo "Path: $path | exists: " . (file_exists($path) ? 'YES' : 'NO') . " | readable: " . (is_readable($path) ? 'YES' : 'NO') . "\n";
    if (file_exists($path) && is_readable($path)) {
        $size = filesize($path);
        echo "Size: $size bytes\n";
        
        $content = file_get_contents($path);
        $lines = explode("\n", $content);
        
        // Filter out verbose headers and auth tokens
        $filtered = [];
        foreach ($lines as $line) {
            if (trim($line) === '') continue;
            if (strpos($line, 'Headers received') !== false) continue;
            if (strpos($line, 'Auth token') !== false) continue;
            $filtered[] = $line;
        }
        
        echo "Total lines: " . count($lines) . " | Filtered: " . count($filtered) . "\n";
        echo "--- LAST 80 FILTERED LOG LINES ---\n";
        $last_lines = array_slice($filtered, -80);
        foreach ($last_lines as $line) {
            echo $line . "\n";
        }
        echo "--- END OF LOG ---\n\n";
    }
}

echo "=== DIRECTORY LISTING ===\n";
print_r(scandir(__DIR__));

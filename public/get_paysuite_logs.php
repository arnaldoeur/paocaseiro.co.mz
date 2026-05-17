<?php
// public/get_paysuite_logs.php
header('Content-Type: text/plain; charset=utf-8');

$paths = [
    __DIR__ . '/error_log',
    __DIR__ . '/../error_log',
    __DIR__ . '/../../error_log',
    '/home/u178468876/domains/paocaseiro.co.mz/nodejs/public/error_log'
];

echo "=== DIAGNOSTICS (FILTERED) ===\n";

$found = false;
foreach ($paths as $path) {
    if (file_exists($path) && is_readable($path)) {
        echo "Reading log: $path\n\n";
        $lines = file($path);
        
        // Filter lines to keep only non-header log lines, or lines containing PaySuite
        $filtered = [];
        foreach ($lines as $line) {
            if (strpos($line, 'Headers received') !== false) {
                continue; // Skip verbose headers
            }
            if (strpos($line, 'Auth token') !== false) {
                continue; // Skip auth token logs
            }
            $filtered[] = $line;
        }
        
        echo "--- LAST 80 FILTERED LOG LINES ---\n";
        $last_lines = array_slice($filtered, -80);
        foreach ($last_lines as $line) {
            echo $line;
        }
        $found = true;
        break;
    }
}

if (!$found) {
    echo "No log found.\n";
}

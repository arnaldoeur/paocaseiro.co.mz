<?php
// public/get_paysuite_logs.php
header('Content-Type: text/plain; charset=utf-8');

$paths = [
    __DIR__ . '/error_log',
    __DIR__ . '/../error_log',
    __DIR__ . '/../../error_log',
    '/home/u178468876/public_html/error_log',
    '/home/u178468876/public_html/public/error_log',
    '/home/u178468876/public_html/paocaseiro.co.mz/error_log'
];

echo "=== DIAGNOSTICS ===\n";
echo "Current directory: " . __DIR__ . "\n";
echo "PHP Error Log Path (ini): " . ini_get('error_log') . "\n\n";

$found = false;
foreach ($paths as $path) {
    if (file_exists($path) && is_readable($path)) {
        echo "Found readable log at: $path (Size: " . filesize($path) . " bytes)\n";
        echo "--- LAST 50 LOG LINES ---\n";
        
        $lines = file($path);
        $last_lines = array_slice($lines, -50);
        foreach ($last_lines as $line) {
            // Only output lines that are relevant to help keep it concise
            echo $line;
        }
        $found = true;
        break;
    }
}

if (!$found) {
    echo "No error_log file found in standard paths. Let's list files in current directory:\n";
    print_r(scandir(__DIR__));
    echo "\nParent directory:\n";
    print_r(scandir(__DIR__ . '/..'));
}

<?php
$content = file_get_contents(__DIR__ . '/paocaseiro_db.php');
$lines = explode("\n", $content);
foreach ($lines as $i => $line) {
    if (stripos($line, 'action') !== false || stripos($line, 'upload') !== false) {
        if (stripos($line, 'case') !== false || stripos($line, 'function') !== false || stripos($line, 'upload') !== false) {
            echo "Line " . ($i + 1) . ": " . trim($line) . "\n";
        }
    }
}

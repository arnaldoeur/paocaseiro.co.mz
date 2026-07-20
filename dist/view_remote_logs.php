<?php
// public/view_remote_logs.php
header("Content-Type: text/plain");
error_reporting(E_ALL);
ini_set('display_errors', 1);

$logFile = __DIR__ . '/error_log';

if (file_exists($logFile)) {
    echo "Last 150 lines of error_log:\n\n";
    $lines = file($logFile);
    $lastLines = array_slice($lines, -150);
    echo implode("", $lastLines);
} else {
    echo "error_log file does not exist at " . $logFile;
}
?>

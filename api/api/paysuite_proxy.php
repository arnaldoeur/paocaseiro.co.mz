<?php
// api/paysuite_proxy.php

// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configuration
$API_URL = 'https://paysuite.tech/api/v1/payments';
$API_KEY = '1203|QiEbaD4qKvnl28TxhVPD3xdGaxSgksvV3GEGK8ZZ384ce7a7'; // Replace with env var in real prod if possible

// Get Input for POST
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Check if verification (GET)
$isVerification = $_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'verify' && isset($_GET['id']);
$targetUrl = $API_URL;
$isPost = true;

if ($isVerification) {
    $txId = $_GET['id'];
    $targetUrl = $API_URL . "/" . $txId; // /api/v1/payments/{id}
    $isPost = false;
}

if (!$isVerification && !$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON']);
    exit;
}

// Forward Request
$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

if ($isPost) {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
} else {
    curl_setopt($ch, CURLOPT_HTTPGET, true);
}

curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json',
    'Authorization: Bearer ' . $API_KEY,
    'User-Agent: PaoCaseiro/1.0',
    'Referer: https://paysuite.co.mz' // Potentially helps WAF
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Curl Error: ' . curl_error($ch)]);
} else {
    http_response_code($httpCode);
    echo $response;
}

curl_close($ch);
?>
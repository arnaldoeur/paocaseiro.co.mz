<?php
// api/paysuite_proxy.php

// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configuration
$API_URL = 'https://paysuite.tech/api/v1/payments';
$API_KEY = '1298|OxFmkooNPDC14WPRIjomqAyJ0np4wp22Fm12j1pt76fd238e'; // Replace with env var in real prod if possible

$method = $_SERVER['REQUEST_METHOD'];

// Handle Verification GET request
if ($method === 'GET') {
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    $id = isset($_GET['id']) ? $_GET['id'] : '';

    if ($action === 'verify' && !empty($id)) {
        $API_URL = $API_URL . '/' . urlencode($id);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid GET parameters']);
        exit;
    }
} else {
    // Handle POST Input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid JSON']);
        exit;
    }
}

// Forward Request
$ch = curl_init($API_URL);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

if ($method === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
} else {
    curl_setopt($ch, CURLOPT_HTTPGET, true);
}

curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json',
    'Authorization: Bearer ' . $API_KEY
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    http_response_code(500);
    $error_msg = 'Curl Error: ' . curl_error($ch);
    file_put_contents(__DIR__ . '/paysuite_debug.txt', date('Y-m-d H:i:s') . " - $method $API_URL - ERROR: $error_msg\n", FILE_APPEND);
    echo json_encode(['success' => false, 'message' => $error_msg]);
} else {
    file_put_contents(__DIR__ . '/paysuite_debug.txt', date('Y-m-d H:i:s') . " - $method $API_URL - REF: " . ($data['reference'] ?? '') . " - RES: $response\n", FILE_APPEND);
    http_response_code($httpCode);
    echo $response;
}

curl_close($ch);
?>
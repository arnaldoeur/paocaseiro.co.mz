<?php
/**
 * Pão Caseiro - PaySuite Secure Proxy
 * This file handles secure API requests to PaySuite to bypass CORS issues on shared hosting.
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$API_KEY = '1298|OxFmkooNPDC14WPRIjomqAyJ0np4wp22Fm12j1pt76fd238e';
$BASE_URL = 'https://paysuite.tech/api/v1/payments';

$action = isset($_GET['action']) ? $_GET['action'] : 'init';
$id = isset($_GET['id']) ? $_GET['id'] : '';

// 1. VERIFY PAYMENT (GET)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'verify' && !empty($id)) {
    $url = $BASE_URL . '/' . $id;
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $API_KEY,
        'Accept: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    http_response_code($httpCode);
    echo $response;
    exit();
}

// 2. INITIATE PAYMENT (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $json = file_get_contents('php://input');
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $BASE_URL);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $API_KEY,
        'Content-Type: application/json',
        'Accept: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    http_response_code($httpCode);
    echo $response;
    exit();
}

// Default response if no conditions met
http_response_code(400);
echo json_encode(["success" => false, "message" => "Invalid request method or action."]);

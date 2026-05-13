<?php
// public/test_pay_api.php
header('Content-Type: application/json');

$PAYSUITE_TOKEN = "1939|bYzLYGtc89gceqRox6udmIRS7gmWdLRj0BO7lRyN074400f8";

$payload = [
    "amount" => "10.00",
    "reference" => "TEST" . time(),
    "description" => "Test Payment",
    "first_name" => "Test",
    "last_name" => "User",
    "email" => "test@example.com",
    "return_url" => "https://paocaseiro.co.mz",
    "cancel_url" => "https://paocaseiro.co.mz"
];

$ch = curl_init("https://paysuite.tech/api/v1/payments");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Accept: application/json",
    "Content-Type: application/json",
    "Authorization: Bearer " . $PAYSUITE_TOKEN
]);

$response = curl_exec($ch);
$err = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo json_encode([
    "http_code" => $httpCode,
    "error" => $err,
    "response" => json_decode($response, true) ?: $response
]);

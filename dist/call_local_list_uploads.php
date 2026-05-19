<?php
// public/call_local_list_uploads.php
$url = "http://localhost:8000/paocaseiro_db.php?action=list_uploads";
$apiKey = "PaoCaseiro_Direct_MySQL_2026";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Authorization: Bearer $apiKey",
    "X-Requested-With: XMLHttpRequest"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["action" => "list_uploads"]));
curl_setopt($ch, CURLOPT_TIMEOUT, 5);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Response: $response\n";
if ($error) {
    echo "Curl Error: $error\n";
}

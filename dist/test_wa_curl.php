<?php
// public/test_wa_curl.php
header("Content-Type: text/plain");
error_reporting(E_ALL);
ini_set('display_errors', 1);

$wa_instance = "Pao caseiro";
$wa_apikey = "429683C4C977415CAAFCCE10F7D57E11";
$wa_url = "https://wa.zyphtech.com";
$endpoint = "/message/sendText/" . rawurlencode($wa_instance);

$payload = [
    "number" => "258876666903",
    "text" => "Teste de cURL a partir do servidor Hostinger para Pão Caseiro.",
    "options" => [
        "delay" => 1200,
        "presence" => "composing",
        "linkPreview" => false
    ]
];

echo "Testing connection to Evolution API...\n";
echo "URL: " . $wa_url . $endpoint . "\n\n";

$ch = curl_init($wa_url . $endpoint);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "apikey: $wa_apikey"
]);

$response = curl_exec($ch);
$err = curl_error($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($err) {
    echo "cURL Error: " . $err . "\n";
} else {
    echo "HTTP Status Code: " . $http_code . "\n";
    echo "Response:\n" . $response . "\n";
}

// Let's also check connection state
echo "\nChecking Connection State...\n";
$ch = curl_init($wa_url . "/instance/connectionState/" . rawurlencode($wa_instance));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "apikey: $wa_apikey"
]);
$response = curl_exec($ch);
$err = curl_error($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($err) {
    echo "cURL Error (State): " . $err . "\n";
} else {
    echo "HTTP Status Code (State): " . $http_code . "\n";
    echo "Response:\n" . $response . "\n";
}
?>

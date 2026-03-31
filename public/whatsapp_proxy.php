<?php
// whatsapp_proxy.php
// This proxy file takes requests to paocaseiro.co.mz/whatsapp_proxy.php and forwards them to wa.zyphtech.com
// This prevents CORS errors from the browser in a production environment (Hostinger).

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, apikey");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Ensure error reporting is off for clean JSON output
error_reporting(0);

// Get the actual requested path, e.g. /whatsapp_proxy.php/message/sendText/...
$request_uri = $_SERVER['REQUEST_URI'];
$base_path = '/whatsapp_proxy.php';
$path_info = '';

if (strpos($request_uri, $base_path) !== false) {
    $path_info = substr($request_uri, strpos($request_uri, $base_path) + strlen($base_path));
}

// Fallback to query param if rewrite fails
if (empty($path_info) && isset($_GET['path'])) {
    $path_info = '/' . ltrim($_GET['path'], '/');
}

$target_url = "https://wa.zyphtech.com" . $path_info;

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $target_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
// Essential headers
$headers = [
    "Content-Type: application/json"
];
// Pass apikey header if present
$headersList = getallheaders();
foreach ($headersList as $key => $value) {
    if (strtolower($key) == 'apikey') {
        $headers[] = "apikey: $value";
    }
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    $input_data = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $input_data);
}

// Ignore SSL verification if needed
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(["error" => "cURL Error: " . curl_error($ch)]);
} else {
    http_response_code($http_code);
    header("Content-Type: application/json");
    echo $response;
}

curl_close($ch);
?>

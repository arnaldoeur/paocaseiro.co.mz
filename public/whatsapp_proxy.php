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

// Get the actual requested path
$request_uri = $_SERVER['REQUEST_URI'];
$script_name = $_SERVER['SCRIPT_NAME'];
$path_info = '';

// Try PATH_INFO first
if (isset($_SERVER['PATH_INFO'])) {
    $path_info = $_SERVER['PATH_INFO'];
} elseif (strpos($request_uri, $script_name) !== false) {
    $path_info = substr($request_uri, strpos($request_uri, $script_name) + strlen($script_name));
}

// Strip query string from path_info if present
if (($pos = strpos($path_info, '?')) !== false) {
    $path_info = substr($path_info, 0, $pos);
}

// Fallback to query param if still empty
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
// Pass apikey header if present (trying multiple ways to get it)
$apikey = '';
if (isset($_SERVER['HTTP_APIKEY'])) {
    $apikey = $_SERVER['HTTP_APIKEY'];
} elseif (function_exists('getallheaders')) {
    $all_headers = getallheaders();
    foreach ($all_headers as $key => $value) {
        if (strtolower($key) == 'apikey') {
            $apikey = $value;
            break;
        }
    }
}

if ($apikey) {
    $headers[] = "apikey: $apikey";
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

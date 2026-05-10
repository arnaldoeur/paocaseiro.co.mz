<?php
$resend_key = "re_P7j69cGh_572YUfnaJMSJJXFNQ7HWPthF";
$to = ["arnaldo.chila@gmail.com"];
$from = "Pão Caseiro <sistema@paocaseiro.co.mz>";
$payload = [
    "from" => $from,
    "to" => $to,
    "subject" => "Test",
    "html" => "<p>test</p>"
];

$ch = curl_init('https://api.resend.com/emails');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $resend_key",
    "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
if(curl_errno($ch)){
    echo 'Curl error: ' . curl_error($ch) . "\n";
}
echo "HTTP CODE: $code\n";
echo "RESPONSE: $res\n";

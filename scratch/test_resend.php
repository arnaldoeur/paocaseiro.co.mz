<?php
$resend_key = "re_S6EgeUY6_L24YuNaVSrmAC265zq9wQxwh";
$p = [
    "from" => "Pão Caseiro <onboarding@resend.dev>",
    "to" => ["random@example.com"],
    "subject" => "Test",
    "html" => "<p>test</p>"
];
$ch = curl_init('https://api.resend.com/emails');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($p));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $resend_key",
    "Content-Type: application/json"
]);
$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
if(curl_errno($ch)){
    echo 'Curl error: ' . curl_error($ch) . "\n";
}
echo "HTTP CODE: $code\n";
echo "RESPONSE: $res\n";

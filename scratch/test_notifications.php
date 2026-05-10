<?php
// scratch/test_notifications.php
// This script tests WhatsApp and SMS directly from the server.

require_once __DIR__ . '/../public/paocaseiro_db.php';

$db = new PaoCaseiroDB();

echo "Testing WhatsApp...\n";
$wa_res = $db->send_whatsapp("258879146662", "Teste de Sistema Pao Caseiro - WhatsApp " . date('H:i:s'));
echo "WhatsApp Response: " . json_encode($wa_res) . "\n\n";

echo "Testing SMS...\n";
$sms_res = $db->send_sms("258879146662", "Teste de Sistema Pao Caseiro - SMS " . date('H:i:s'));
echo "SMS Response: " . json_encode($sms_res) . "\n\n";

?>

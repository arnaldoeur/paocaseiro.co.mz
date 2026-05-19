<?php
$urls = [
    "https://paocaseiro.co.mz/uploads/blog/1778698099_651240555_122207840474536968_4792883689208626612_n.jpg",
    "https://paocaseiro.co.mz/uploads/blog/1778698152_589885268_25297653269897677_7386437098419246935_n.jpg",
    "https://paocaseiro.co.mz/uploads/blog/1778708202_591685028_25297652196564451_5869581512441907180_n.jpg"
];

foreach ($urls as $url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_NOBODY, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    echo "URL: $url\nHTTP CODE: $code\nERROR: $err\n\n";
}

<?php
$pdo = new PDO('mysql:host=72.60.122.110;dbname=u178468876_pcaseiro', 'u178468876_nazir', '@Pcaseiro25');
$stmt = $pdo->query('SELECT id, name, image FROM products');
$products = $stmt->fetchAll(PDO::FETCH_ASSOC);

$images = [
    'arrofadas.png', 'bola_berlim.png', 'bolo_arroz.png', 'brioche_fruta.png', 'broa_milho.png',
    'cachorro_quente.png', 'charuto.png', 'coxinhas.png', 'croissants_chocolate.png',
    'croissants_folhados.png', 'croissants_recheados.png', 'croissants_simples.png',
    'donuts.png', 'empadas.png', 'fatias_xadrez.png', 'folhado_salsicha.png',
    'folhado_salsicha_queijo.png', 'folhados_carne.png', 'folhados_recheados.png',
    'lacos.png', 'lingua_sogra.png', 'mini_folhados.png', 'nevada.png', 'palmier.png',
    'palmier_recheado.png', 'pao_caseiro.png', 'pao_cereais.png', 'pao_deus.png',
    'pao_forma_integral.png', 'pao_forma_simples.png', 'pao_integral.png',
    'pao_portugues.png', 'pastel_coco.png', 'pastel_nata.png', 'pizza_mexicana.png',
    'pudim.png', 'queques.png', 'rissois_camarao.png', 'rolo_acucar_canela.png',
    'samosas.png', 'torta.png', 'waffle_stick.png'
];

foreach ($products as $p) {
    if (!empty($p['image']) && strpos($p['image'], 'http') === 0) continue;
    
    $name = strtolower($p['name']);
    $bestMatch = null;
    $bestScore = 0;
    
    foreach ($images as $img) {
        $imgName = str_replace(['.png', '.jpg', '.jpeg', '_'], ['', '', '', ' '], strtolower($img));
        
        // Simple matching
        if (strpos($name, $imgName) !== false || strpos($imgName, $name) !== false) {
             $bestMatch = "images/" . $img;
             break;
        }
    }
    
    if ($bestMatch) {
        $stmtUpdate = $pdo->prepare("UPDATE products SET image = ? WHERE id = ?");
        $stmtUpdate->execute([$bestMatch, $p['id']]);
        echo "Updated {$p['name']} to $bestMatch\n";
    }
}
?>

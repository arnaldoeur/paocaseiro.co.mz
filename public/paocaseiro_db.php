<?php
// public/paocaseiro_db.php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Resposta para Preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

// CONFIGURAÇÕES DE SEGURANÇA
$API_KEY = "PaoCaseiro_Direct_MySQL_2026"; // Chave de segurança para o frontend

// CREDENCIAIS DA HOSTINGER
$isLocal = strpos($_SERVER['HTTP_HOST'] ?? '', 'localhost') !== false;
$host = $isLocal ? "72.60.122.110" : "127.0.0.1";
$port = "3306";
$user = "u178468876_nazir";
$pass = "@Pcaseiro25";
$db   = "u178468876_pcaseiro";

try {
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ];
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4", $user, $pass, $options);
} catch (PDOException $e) {
    http_response_code(500);
    die(json_encode(["error" => "Falha na conexão com Hostinger: " . $e->getMessage()]));
}

// VALIDAÇÃO DE AUTORIZAÇÃO
$headers = getallheaders();
$auth = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : '';

if ($auth !== $API_KEY) {
    http_response_code(401);
    die(json_encode(["error" => "Acesso não autorizado."]));
}

// JWT HELPER FUNCTIONS
$JWT_SECRET = "pc_super_secret_jwt_key_2026_hostinger";

function generate_jwt($payload, $secret) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

function verify_jwt($jwt, $secret) {
    $tokenParts = explode('.', $jwt);
    if (count($tokenParts) != 3) return false;
    $signature_provided = $tokenParts[2];
    $base64UrlHeader = $tokenParts[0];
    $base64UrlPayload = $tokenParts[1];
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    if ($base64UrlSignature === $signature_provided) {
        return json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $tokenParts[1])), true);
    }
    return false;
}

// PROCESSAMENTO DA REQUISIÇÃO
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    // --- PRODUCTS ---
    case 'get_products':
        $stmt = $pdo->query("SELECT * FROM products ORDER BY category, name");
        echo json_encode($stmt->fetchAll());
        break;

    case 'bulk_save_products':
        try {
            $pdo->beginTransaction();
            $products = $input['products'] ?? [];
            foreach ($products as $p) {
                $id = $p['id'] ?? uniqid();
                // Map frontend names to DB names if needed
                $name = $p['name'] ?? null;
                $category = $p['category'] ?? null;
                $price = $p['price'] ?? null;
                $stock = $p['stock_quantity'] ?? $p['stockQuantity'] ?? 0;
                $available = isset($p['is_available']) ? $p['is_available'] : (isset($p['inStock']) ? $p['inStock'] : 1);
                
                $sql = "INSERT INTO products (id, name, category, price, stock_quantity, is_available) 
                        VALUES (?, ?, ?, ?, ?, ?) 
                        ON DUPLICATE KEY UPDATE 
                            name=COALESCE(?, name), 
                            category=COALESCE(?, category), 
                            price=COALESCE(?, price), 
                            stock_quantity=VALUES(stock_quantity), 
                            is_available=VALUES(is_available)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$id, $name, $category, $price, $stock, $available, $name, $category, $price]);
            }
            $pdo->commit();
            echo json_encode(["success" => true]);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'save_product':
        $data = $input['product_data'] ?? $input;
        $id = $data['id'];
        $variations = isset($data['variations']) ? (is_array($data['variations']) ? json_encode($data['variations']) : $data['variations']) : '[]';
        $complements = isset($data['complements']) ? (is_array($data['complements']) ? json_encode($data['complements']) : $data['complements']) : '[]';

        $sql = "INSERT INTO products (id, name, name_en, price, image, category, description, description_en, prep_time, delivery_time, unit, stock_quantity, is_available, variations, complements, tax_type, show_in_menu, purchase_price, other_cost, margin_percentage) 
                VALUES (:id, :name, :name_en, :price, :image, :category, :description, :description_en, :prep_time, :delivery_time, :unit, :stock_quantity, :is_available, :variations, :complements, :tax_type, :show_in_menu, :purchase_price, :other_cost, :margin_percentage)
                ON DUPLICATE KEY UPDATE 
                name=VALUES(name), name_en=VALUES(name_en), price=VALUES(price), image=VALUES(image), category=VALUES(category), 
                description=VALUES(description), description_en=VALUES(description_en), prep_time=VALUES(prep_time), 
                delivery_time=VALUES(delivery_time), unit=VALUES(unit), stock_quantity=VALUES(stock_quantity), 
                is_available=VALUES(is_available), variations=VALUES(variations), complements=VALUES(complements),
                tax_type=VALUES(tax_type), show_in_menu=VALUES(show_in_menu), purchase_price=VALUES(purchase_price),
                other_cost=VALUES(other_cost), margin_percentage=VALUES(margin_percentage)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':id' => $id,
            ':name' => $data['name'],
            ':name_en' => $data['name_en'] ?? null,
            ':price' => $data['price'],
            ':image' => $data['image'] ?? null,
            ':category' => $data['category'] ?? null,
            ':description' => $data['description'] ?? null,
            ':description_en' => $data['description_en'] ?? null,
            ':prep_time' => $data['prep_time'] ?? null,
            ':delivery_time' => $data['delivery_time'] ?? null,
            ':unit' => $data['unit'] ?? 'un',
            ':stock_quantity' => $data['stock_quantity'] ?? 0,
            ':is_available' => (isset($data['is_available']) && $data['is_available']) ? 1 : 0,
            ':variations' => $variations,
            ':complements' => $complements,
            ':tax_type' => $data['tax_type'] ?? 'standard',
            ':show_in_menu' => $data['show_in_menu'] ?? 1,
            ':purchase_price' => $data['purchase_price'] ?? 0,
            ':other_cost' => $data['other_cost'] ?? 0,
            ':margin_percentage' => $data['margin_percentage'] ?? 0
        ]);
        echo json_encode(["success" => true]);
        break;

    case 'update_product_status':
        $stmt = $pdo->prepare("UPDATE products SET is_available = ? WHERE id = ?");
        $stmt->execute([$input['is_available'] ? 1 : 0, $input['id']]);
        echo json_encode(['success' => true]);
        break;

    case 'delete_product':
        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        $stmt->execute([$input['id']]);
        echo json_encode(["success" => true]);
        break;

    // --- ORDERS ---
    case 'get_orders':
        $status = $input['status'] ?? $_GET['status'] ?? null;
        $customer_id = $input['customer_id'] ?? $_GET['customer_id'] ?? null;
        $customer_phone = $input['customer_phone'] ?? $_GET['customer_phone'] ?? null;
        $driver_id = $input['driver_id'] ?? $_GET['driver_id'] ?? null;
        
        $where = [];
        $params = [];
        if ($status) { 
            if (is_array($status)) {
                $placeholders = implode(',', array_fill(0, count($status), '?'));
                $where[] = "o.status IN ($placeholders)";
                foreach ($status as $s) $params[] = $s;
            } else {
                $where[] = "o.status = ?"; 
                $params[] = $status; 
            }
        }
        if ($customer_id) { $where[] = "o.customer_id = ?"; $params[] = $customer_id; }
        elseif ($customer_phone) { 
            $localPhone = preg_replace('/\D/', '', $customer_phone);
            $localPhone = (strlen($localPhone) > 9) ? substr($localPhone, -9) : $localPhone;
            $where[] = "c.phone LIKE ?"; 
            $params[] = "%$localPhone%"; 
        }
        if ($driver_id) { $where[] = "o.driver_id = ?"; $params[] = $driver_id; }
        
        $where_clause = count($where) > 0 ? " WHERE " . implode(" AND ", $where) : "";
        $sql = "SELECT o.*, c.name as customer_name, c.phone as customer_phone 
                FROM orders o 
                LEFT JOIN customers c ON o.customer_id = c.id 
                $where_clause 
                ORDER BY o.created_at DESC LIMIT 100";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();
        
        foreach ($orders as &$order) {
            $stmtItem = $pdo->prepare("SELECT * FROM order_items WHERE order_id = ?");
            $stmtItem->execute([$order['id']]);
            $order['items'] = $stmtItem->fetchAll();
        }
        echo json_encode($orders);
        break;

    case 'save_order':
        try {
            $pdo->beginTransaction();
            $o = $input['order_data'] ?? $input;
            $orderId = $o['id'] ?? uniqid();
            
            // 1. Ensure customer exists or update
            $stmtC = $pdo->prepare("INSERT INTO customers (id, name, phone, contact_no, email, address) 
                                   VALUES (?, ?, ?, ?, ?, ?) 
                                   ON DUPLICATE KEY UPDATE name=VALUES(name), last_order_at=NOW()");
            $stmtC->execute([
                $o['customer_id'] ?? uniqid(),
                $o['customer_name'], 
                $o['customer_phone'], 
                $o['customer_phone'],
                $o['customer_email'] ?? null,
                $o['delivery_address'] ?? null
            ]);
            $customerId = $o['customer_id'] ?? $pdo->lastInsertId();

            // 2. Insert/Update Order
            $sql = "INSERT INTO orders (id, short_id, customer_id, customer_name, customer_phone, customer_email, total_amount, status, delivery_type, delivery_address, notes, payment_method, payment_status, estimated_ready_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE status=VALUES(status), payment_status=VALUES(payment_status), notes=VALUES(notes), estimated_ready_at=VALUES(estimated_ready_at)";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $orderId, 
                $o['short_id'] ?? strtoupper(substr($orderId, -6)),
                $customerId,
                $o['customer_name'],
                $o['customer_phone'],
                $o['customer_email'] ?? null,
                $o['total_amount'] ?? 0,
                $o['status'] ?? 'pending',
                $o['delivery_type'] ?? 'pickup',
                $o['delivery_address'] ?? null,
                $o['notes'] ?? null,
                $o['payment_method'] ?? 'cash',
                $o['payment_status'] ?? 'pending',
                $o['estimated_ready_at'] ?? null
            ]);

            // 3. Save items
            if (isset($o['items']) && is_array($o['items'])) {
                $stmtDel = $pdo->prepare("DELETE FROM order_items WHERE order_id = ?");
                $stmtDel->execute([$orderId]);

                $stmtItem = $pdo->prepare("INSERT INTO order_items (id, order_id, product_name, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?)");
                foreach ($o['items'] as $item) {
                    $stmtItem->execute([
                        $item['id'] ?? uniqid(),
                        $orderId,
                        $item['name'] ?? $item['product_name'],
                        $item['quantity'],
                        $item['price'],
                        ($item['quantity'] * $item['price'])
                    ]);
                }
            }

            $pdo->commit();
            echo json_encode(["success" => true, "id" => $orderId, "short_id" => $o['short_id'] ?? strtoupper(substr($orderId, -6))]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'update_order_status':
        $id = $input['id'] ?? $input['short_id'] ?? '';
        $stmt = $pdo->prepare("UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ? OR short_id = ?");
        $stmt->execute([$input['status'], $id, $id]);
        echo json_encode(["success" => true]);
        break;

    // --- CUSTOMERS ---
    case 'get_customers':
        $stmt = $pdo->query("SELECT * FROM customers ORDER BY name");
        echo json_encode($stmt->fetchAll());
        break;

    case 'get_customer_by_identifier':
        $identifier = $input['identifier'] ?? '';
        $stmt = $pdo->prepare("SELECT * FROM customers WHERE phone = ? OR contact_no = ? OR email = ? LIMIT 1");
        $stmt->execute([$identifier, $identifier, $identifier]);
        $customer = $stmt->fetch();
        if ($customer) unset($customer['password']);
        echo json_encode($customer);
        break;

    case 'auth_customer':
        $identifier = $input['identifier'] ?? '';
        $stmt = $pdo->prepare("SELECT * FROM customers WHERE phone = ? OR contact_no = ? OR email = ?");
        $stmt->execute([$identifier, $identifier, $identifier]);
        $customer = $stmt->fetch();
        
        if ($customer) {
            $authenticated = false;
            $password = $input['password'] ?? '';
            if (isset($customer['password']) && password_verify($password, $customer['password'])) {
                $authenticated = true;
            } else if (isset($customer['password']) && $password === $customer['password']) {
                $newHash = password_hash($password, PASSWORD_BCRYPT);
                $updateStmt = $pdo->prepare("UPDATE customers SET password = ? WHERE id = ?");
                $updateStmt->execute([$newHash, $customer['id']]);
                $authenticated = true;
            }
            
            if ($authenticated) {
                unset($customer['password']);
                $token = generate_jwt(['id' => $customer['id'], 'role' => 'customer', 'exp' => time() + (86400 * 30)], $JWT_SECRET);
                echo json_encode(['success' => true, 'user' => $customer, 'token' => $token]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
            }
        } else {
            echo json_encode(['success' => false, 'error' => 'User not found']);
        }
        break;

    case 'auth_customer_google':
        $email = $input['email'] ?? '';
        $name = $input['name'] ?? '';
        $avatar_url = $input['avatar_url'] ?? '';
        
        if (!$email) {
            echo json_encode(['success' => false, 'error' => 'Email required for Google Login']);
            break;
        }

        $stmt = $pdo->prepare("SELECT * FROM customers WHERE email = ?");
        $stmt->execute([$email]);
        $customer = $stmt->fetch();

        if (!$customer) {
            // Auto register
            $id = uniqid('g_');
            $stmtInsert = $pdo->prepare("INSERT INTO customers (id, email, name, avatar_url, contact_no) VALUES (?, ?, ?, ?, ?)");
            $stmtInsert->execute([$id, $email, $name, $avatar_url, $email]);
            
            $stmt->execute([$email]);
            $customer = $stmt->fetch();
        } else {
            // Update avatar if missing
            if (!$customer['avatar_url'] && $avatar_url) {
                $pdo->prepare("UPDATE customers SET avatar_url = ? WHERE id = ?")->execute([$avatar_url, $customer['id']]);
                $customer['avatar_url'] = $avatar_url;
            }
        }

        unset($customer['password']);
        $token = generate_jwt(['id' => $customer['id'], 'role' => 'customer', 'exp' => time() + (86400 * 30)], $JWT_SECRET);
        echo json_encode(['success' => true, 'user' => $customer, 'token' => $token]);
        break;

    case 'register_customer':
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';
        $name = $input['name'] ?? '';
        $phone = $input['phone'] ?? '';
        
        if (!$email || !$password) {
            echo json_encode(['success' => false, 'error' => 'Email and password required']);
            break;
        }

        // Check if exists
        $stmt = $pdo->prepare("SELECT id FROM customers WHERE email = ? OR contact_no = ?");
        $stmt->execute([$email, $phone]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'error' => 'Customer already exists']);
            break;
        }

        $id = uniqid('c_');
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmtInsert = $pdo->prepare("INSERT INTO customers (id, email, password, name, contact_no, phone) VALUES (?, ?, ?, ?, ?, ?)");
        $stmtInsert->execute([$id, $email, $hash, $name, $phone, $phone]);

        $stmt = $pdo->prepare("SELECT * FROM customers WHERE id = ?");
        $stmt->execute([$id]);
        $customer = $stmt->fetch();
        unset($customer['password']);
        
        $token = generate_jwt(['id' => $customer['id'], 'role' => 'customer', 'exp' => time() + (86400 * 30)], $JWT_SECRET);
        echo json_encode(['success' => true, 'user' => $customer, 'token' => $token]);
        break;

    case 'save_customer':
        $c = $input['customer'] ?? $input;
        $password = $c['password'] ?? null;
        $updates = "phone=VALUES(phone), name=VALUES(name), address=VALUES(address), 
                    email=VALUES(email), contact_no=VALUES(contact_no), whatsapp=VALUES(whatsapp), 
                    internal_id=VALUES(internal_id), avatar_url=VALUES(avatar_url), date_of_birth=VALUES(date_of_birth),
                    street=VALUES(street), reference_point=VALUES(reference_point), nuit=VALUES(nuit),
                    is_blocked=VALUES(is_blocked)";
        
        $params = [$c['id'], $c['phone'], $c['name'], $c['address'] ?? null, $c['email'] ?? null, 
                   $c['contact_no'] ?? $c['phone'], $c['whatsapp'] ?? null, $c['internal_id'] ?? null,
                   $c['avatar_url'] ?? null, $c['date_of_birth'] ?? null, $c['street'] ?? null, 
                   $c['reference_point'] ?? null, $c['nuit'] ?? null, $c['is_blocked'] ?? 0];
        
        if ($password) {
            if (strpos($password, '$2y$') !== 0) {
                $password = password_hash($password, PASSWORD_BCRYPT);
            }
            $sql = "INSERT INTO customers (id, phone, name, address, email, contact_no, whatsapp, internal_id, avatar_url, date_of_birth, street, reference_point, nuit, is_blocked, password) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE $updates, password=VALUES(password)";
            $params[] = $password;
        } else {
            $sql = "INSERT INTO customers (id, phone, name, address, email, contact_no, whatsapp, internal_id, avatar_url, date_of_birth, street, reference_point, nuit, is_blocked) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE $updates";
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode(["success" => true]);
        break;

    case 'delete_customer':
        $id = $input['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare("DELETE FROM customers WHERE id = ?");
            $stmt->execute([$id]);
        }
        echo json_encode(["success" => true]);
        break;

    // --- TEAM & AUTH ---
    case 'get_team':
        $stmt = $pdo->query("SELECT * FROM team_members ORDER BY name ASC");
        echo json_encode($stmt->fetchAll());
        break;

    case 'auth_team':
        $stmt = $pdo->prepare("SELECT * FROM team_members WHERE username = ? AND is_active = 1");
        $stmt->execute([$input['username']]);
        $user = $stmt->fetch();
        if ($user) {
            $authenticated = false;
            $password = $input['password'] ?? '';
            if (password_verify($password, $user['password'])) {
                $authenticated = true;
            } else if ($password === $user['password']) {
                $newHash = password_hash($password, PASSWORD_BCRYPT);
                $updateStmt = $pdo->prepare("UPDATE team_members SET password = ? WHERE id = ?");
                $updateStmt->execute([$newHash, $user['id']]);
                $authenticated = true;
            }
            if ($authenticated) {
                unset($user['password']);
                echo json_encode($user);
            } else {
                echo json_encode(null);
            }
        } else {
            echo json_encode(null);
        }
        break;

    case 'save_team_member':
        $t = $input['member'] ?? $input;
        $password = $t['password'];
        if (strpos($password, '$2y$') !== 0) {
            $password = password_hash($password, PASSWORD_BCRYPT);
        }
        $sql = "INSERT INTO team_members (id, name, username, email, phone, role, password, avatar_url, is_active) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE name=VALUES(name), username=VALUES(username), email=VALUES(email), 
                phone=VALUES(phone), role=VALUES(role), password=VALUES(password), avatar_url=VALUES(avatar_url), is_active=VALUES(is_active)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$t['id'] ?? uniqid(), $t['name'], $t['username'], $t['email'], $t['phone'], $t['role'], $password, $t['avatar_url'] ?? null, $t['is_active'] ?? 1]);
        echo json_encode(['success' => true]);
        break;

    case 'delete_team_member':
        $stmt = $pdo->prepare("DELETE FROM team_members WHERE id = ?");
        $stmt->execute([$input['id']]);
        echo json_encode(['success' => true]);
        break;

    // --- BLOG ---
    case 'get_blog_posts':
        $stmt = $pdo->query("SELECT * FROM blog_posts ORDER BY created_at DESC");
        echo json_encode($stmt->fetchAll());
        break;

    case 'get_blog_post_by_slug':
        $slug = $input['slug'] ?? '';
        $stmt = $pdo->prepare("SELECT * FROM blog_posts WHERE slug = ?");
        $stmt->execute([$slug]);
        echo json_encode($stmt->fetch());
        break;

    case 'get_blog_comments':
        $postId = $input['post_id'] ?? '';
        $stmt = $pdo->prepare("SELECT * FROM blog_comments WHERE post_id = ? ORDER BY created_at ASC");
        $stmt->execute([$postId]);
        echo json_encode($stmt->fetchAll());
        break;

    case 'save_blog_comment':
        $postId = $input['post_id'];
        $author = $input['author'];
        $content = $input['content'];
        $userId = $input['user_id'] ?? null;
        $status = $input['status'] ?? 'pending';
        
        $stmt = $pdo->prepare("INSERT INTO blog_comments (id, post_id, author, content, user_id, status) VALUES (?, ?, ?, ?, ?, ?)");
        $id = uniqid('bc_');
        $stmt->execute([$id, $postId, $author, $content, $userId, $status]);
        
        $stmt = $pdo->prepare("SELECT * FROM blog_comments WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    case 'delete_blog_comment':
        $id = $input['id'];
        $stmt = $pdo->prepare("DELETE FROM blog_comments WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    // --- QUEUE / TICKETS ---
    case 'generate_ticket':
        $phone = $input['p_phone'] ?? null;
        $userId = $input['p_user_id'] ?? null;
        $priority = $input['p_priority'] ?? false;
        $category = $input['p_category'] ?? 'Geral';
        
        $identifier = $phone ?? $userId;
        if (!$identifier) {
            echo json_encode(['success' => false, 'error' => 'Identifier required']);
            break;
        }

        // Check if already has active ticket
        $stmt = $pdo->prepare("SELECT * FROM queue_tickets WHERE (customer_phone = ? OR user_id = ?) AND status = 'waiting' LIMIT 1");
        $stmt->execute([$phone, $userId]);
        $existing = $stmt->fetch();
        if ($existing) {
            echo json_encode(['success' => true, 'data' => [$existing]]);
            break;
        }

        // Get max ticket number for today
        $today = date('Y-m-d');
        $stmt = $pdo->prepare("SELECT MAX(ticket_number) as max_num FROM queue_tickets WHERE DATE(created_at) = ?");
        $stmt->execute([$today]);
        $row = $stmt->fetch();
        $nextNum = ($row['max_num'] ?? 0) + 1;

        $id = uniqid('t_');
        $stmt = $pdo->prepare("INSERT INTO queue_tickets (id, customer_phone, user_id, ticket_number, priority, category, status) VALUES (?, ?, ?, ?, ?, ?, 'waiting')");
        $stmt->execute([$id, $phone, $userId, $nextNum, $priority ? 1 : 0, $category]);

        $stmt = $pdo->prepare("SELECT * FROM queue_tickets WHERE id = ?");
        $stmt->execute([$id]);
        $newTicket = $stmt->fetch();
        echo json_encode(['success' => true, 'data' => [$newTicket]]);
        break;

    case 'get_queue_count':
        $createdAt = $input['created_at'];
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM queue_tickets WHERE status = 'waiting' AND created_at < ?");
        $stmt->execute([$createdAt]);
        echo json_encode($stmt->fetch());
        break;

    case 'get_active_ticket':
        $identifier = $input['identifier'] ?? '';
        $stmt = $pdo->prepare("SELECT * FROM queue_tickets WHERE (user_id = ? OR customer_phone = ?) AND status IN ('waiting', 'calling') AND DATE(created_at) = CURDATE() ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([$identifier, $identifier]);
        echo json_encode($stmt->fetch());
        break;

    case 'get_tickets_today':
        $stmt = $pdo->prepare("SELECT * FROM queue_tickets WHERE DATE(created_at) = CURDATE() ORDER BY created_at ASC");
        $stmt->execute();
        echo json_encode($stmt->fetchAll());
        break;

    case 'generate_ticket':
        $isPriority = $input['is_priority'] ?? 0;
        $phone = $input['phone'] ?? null;
        $category = $input['category'] ?? 'Geral';
        $userId = $input['user_id'] ?? null;
        
        try {
            $pdo->beginTransaction();
            
            // Get today's ticket count for the ticket number
            $stmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM queue_tickets WHERE DATE(created_at) = CURDATE()");
            $stmt->execute();
            $count = $stmt->fetch()['cnt'] + 1;
            
            $prefix = $isPriority ? 'P' : 'N';
            $ticketNumber = $prefix . str_pad($count, 3, '0', STR_PAD_LEFT);
            $id = uniqid();
            
            $sql = "INSERT INTO queue_tickets (id, ticket_number, is_priority, category, status, customer_phone, user_id, created_at) 
                    VALUES (?, ?, ?, ?, 'waiting', ?, ?, NOW())";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id, $ticketNumber, $isPriority, $category, $phone, $userId]);
            
            $stmt = $pdo->prepare("SELECT * FROM queue_tickets WHERE id = ?");
            $stmt->execute([$id]);
            $ticket = $stmt->fetch();
            
            $pdo->commit();
            echo json_encode($ticket);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'update_ticket_status':
        $id = $input['id'];
        $status = $input['status'];
        $counter = $input['counter'] ?? null;
        
        $sql = "UPDATE queue_tickets SET status = ?";
        $params = [$status];
        
        if ($status === 'calling' && $counter) {
            $sql .= ", counter = ?, called_at = NOW()";
            $params[] = $counter;
        }
        
        $sql .= " WHERE id = ?";
        $params[] = $id;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        $stmt = $pdo->prepare("SELECT * FROM queue_tickets WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    case 'update_ticket':
        $id = $input['id'];
        $updates = $input['updates'] ?? [];
        if (empty($updates)) {
            echo json_encode(["error" => "No updates provided"]);
            break;
        }
        
        $setClauses = [];
        $params = [];
        foreach ($updates as $key => $value) {
            // Basic sanitization of column names
            $safeKey = preg_replace('/[^a-zA-Z0-9_]/', '', $key);
            $setClauses[] = "$safeKey = ?";
            $params[] = $value;
        }
        $params[] = $id;
        
        $sql = "UPDATE queue_tickets SET " . implode(", ", $setClauses) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        $stmt = $pdo->prepare("SELECT * FROM queue_tickets WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    case 'reset_today_queue':
        $stmt = $pdo->prepare("UPDATE queue_tickets SET status = 'cancelled' WHERE status IN ('waiting', 'calling') AND DATE(created_at) = CURDATE()");
        $stmt->execute();
        echo json_encode(["success" => true]);
        break;

    case 'get_next_ticket':
        $counter = $input['counter'];
        // Try priority first
        $stmt = $pdo->prepare("SELECT * FROM queue_tickets WHERE status = 'waiting' AND is_priority = 1 AND DATE(created_at) = CURDATE() ORDER BY created_at ASC LIMIT 1");
        $stmt->execute();
        $ticket = $stmt->fetch();
        
        // If no priority, try normal
        if (!$ticket) {
            $stmt = $pdo->prepare("SELECT * FROM queue_tickets WHERE status = 'waiting' AND is_priority = 0 AND DATE(created_at) = CURDATE() ORDER BY created_at ASC LIMIT 1");
            $stmt->execute();
            $ticket = $stmt->fetch();
        }
        
        if ($ticket) {
            $updateStmt = $pdo->prepare("UPDATE queue_tickets SET status = 'calling', counter = ?, called_at = NOW() WHERE id = ?");
            $updateStmt->execute([$counter, $ticket['id']]);
            
            $stmt = $pdo->prepare("SELECT * FROM queue_tickets WHERE id = ?");
            $stmt->execute([$ticket['id']]);
            $ticket = $stmt->fetch();
        }
        
        echo json_encode($ticket);
        break;

    // --- WORK SESSIONS ---
    case 'get_active_work_session':
        $memberId = $input['member_id'] ?? '';
        $stmt = $pdo->prepare("SELECT * FROM work_sessions WHERE member_id = ? AND status = 'active' ORDER BY clock_in DESC LIMIT 1");
        $stmt->execute([$memberId]);
        echo json_encode($stmt->fetch());
        break;

    case 'save_work_session':
        $s = $input['session'] ?? $input;
        $id = $s['id'] ?? uniqid();
        $member_id = $s['member_id'];
        $member_name = $s['member_name'] ?? '';
        $role = $s['role'] ?? 'staff';
        $clock_in = $s['clock_in'] ?? date('Y-m-d H:i:s');
        $status = $s['status'] ?? 'active';

        try {
            $sql = "INSERT INTO work_sessions (id, member_id, member_name, role, clock_in, status) VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id, $member_id, $member_name, $role, $clock_in, $status]);
        } catch (PDOException $e) {
            // Fallback for older schema
            $sql = "INSERT INTO work_sessions (id, member_id, clock_in, status) VALUES (?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id, $member_id, $clock_in, $status]);
        }
        echo json_encode(['success' => true, 'id' => $id]);
        break;

    case 'get_work_sessions':
        $member_id = $input['member_id'] ?? null;
        $status = $input['status'] ?? null;
        $where = [];
        $params = [];
        if ($member_id) { $where[] = "member_id = ?"; $params[] = $member_id; }
        if ($status) { $where[] = "status = ?"; $params[] = $status; }
        $where_clause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";
        $stmt = $pdo->prepare("SELECT * FROM work_sessions $where_clause ORDER BY clock_in DESC LIMIT 100");
        $stmt->execute($params);
        echo json_encode($stmt->fetchAll());
        break;

    case 'update_work_session':
        $id = $input['id'] ?? '';
        $status = $input['status'] ?? 'completed';
        $clock_out = $input['clock_out'] ?? date('Y-m-d H:i:s');
        $stmt = $pdo->prepare("UPDATE work_sessions SET status = ?, clock_out = ? WHERE id = ?");
        $stmt->execute([$status, $clock_out, $id]);
        echo json_encode(['success' => true]);
        break;

    // --- SYSTEM & AUDIT ---
    case 'get_system_settings':
        $stmt = $pdo->query("SELECT `key`, `value` FROM system_settings");
        $settings = $stmt->fetchAll();
        $response = [];
        foreach ($settings as $s) {
            $decoded = json_decode($s['value'], true);
            $response[] = [
                'key' => $s['key'],
                'value' => (json_last_error() === JSON_ERROR_NONE) ? $decoded : $s['value']
            ];
        }
        echo json_encode($response);
        break;

    case 'save_setting':
        $stmt = $pdo->prepare("INSERT INTO system_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)");
        $stmt->execute([$input['key'], is_array($input['value']) ? json_encode($input['value']) : $input['value']]);
        echo json_encode(["success" => true]);
        break;

    case 'save_audit_log':
        $l = $input['log'] ?? $input;
        $sql = "INSERT INTO audit_logs (id, action, entity_type, entity_id, details, performed_by, customer_phone, user_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$l['id'] ?? uniqid(), $l['action'], $l['entity_type'], $l['entity_id'] ?? null, 
                       json_encode($l['details'] ?? []), $l['performed_by'] ?? 'system', $l['customer_phone'] ?? null, $l['user_id'] ?? null]);
        echo json_encode(["success" => true]);
        break;

    // --- NOTIFICATIONS ---
    case 'get_notifications':
        $limit = $input['limit'] ?? 50;
        $stmt = $pdo->prepare("SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?");
        $stmt->bindValue(1, (int)$limit, PDO::PARAM_INT);
        $stmt->execute();
        echo json_encode($stmt->fetchAll());
        break;

    case 'mark_notification_read':
        $stmt = $pdo->prepare("UPDATE notifications SET `read` = 1 WHERE id = ?");
        $stmt->execute([$input['id']]);
        echo json_encode(["success" => true]);
        break;

    case 'mark_all_notifications_read':
        $pdo->query("UPDATE notifications SET `read` = 1 WHERE `read` = 0");
        echo json_encode(["success" => true]);
        break;

    // --- DRIVERS / LOGISTICS ---
    case 'get_drivers':
        $stmt = $pdo->query("SELECT * FROM logistics_drivers ORDER BY name");
        echo json_encode($stmt->fetchAll());
        break;

    case 'save_driver':
        $d = $input['driver'] ?? $input;
        $sql = "INSERT INTO logistics_drivers (id, name, phone, email, alternative_phone, vehicle_type, base_location, avatar_url, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), email=VALUES(email), 
                alternative_phone=VALUES(alternative_phone), vehicle_type=VALUES(vehicle_type), 
                base_location=VALUES(base_location), avatar_url=VALUES(avatar_url), status=VALUES(status)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$d['id'] ?? uniqid(), $d['name'], $d['phone'], $d['email'] ?? null, 
                        $d['alternative_phone'] ?? null, $d['vehicle_type'], $d['base_location'] ?? null, 
                        $d['avatar_url'] ?? null, $d['status'] ?? 'available']);
        echo json_encode(["success" => true]);
        break;

    case 'delete_driver':
        $stmt = $pdo->prepare("DELETE FROM logistics_drivers WHERE id = ?");
        $stmt->execute([$input['id']]);
        echo json_encode(["success" => true]);
        break;
    case 'get_driver_by_identifier':
        $idnt = $input['identifier'] ?? '';
        $stmt = $pdo->prepare("SELECT * FROM logistics_drivers WHERE phone = ? OR alternative_phone = ? OR email = ? LIMIT 1");
        $stmt->execute([$idnt, $idnt, $idnt]);
        echo json_encode($stmt->fetch());
        break;

    case 'update_driver':
        $d = $input['driver'] ?? $input;
        $id = $d['id'];
        $set = [];
        $params = [];
        foreach ($d as $key => $val) {
            if ($key === 'id') continue;
            $set[] = "`$key` = ?";
            $params[] = $val;
        }
        $params[] = $id;
        $sql = "UPDATE logistics_drivers SET " . implode(', ', $set) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode(["success" => true]);
        break;

    case 'update_order':
        $id = $input['id'];
        unset($input['id']);
        unset($input['action']);
        $set = [];
        $params = [];
        foreach ($input as $key => $val) {
            $set[] = "`$key` = ?";
            $params[] = $val;
        }
        $params[] = $id;
        $sql = "UPDATE orders SET " . implode(', ', $set) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode(["success" => true]);
        break;

    case 'update_team_member':
        $d = $input['member'] ?? $input;
        $id = $d['id'];
        $set = [];
        $params = [];
        foreach ($d as $key => $val) {
            if ($key === 'id') continue;
            $set[] = "`$key` = ?";
            $params[] = $val;
        }
        $params[] = $id;
        $sql = "UPDATE team_members SET " . implode(', ', $set) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode(["success" => true]);
        break;

    case 'get_contact_messages':

        $folder = $input['folder'] ?? 'inbox';
        if ($folder === 'trash') {
            $stmt = $pdo->query("SELECT * FROM contact_messages WHERE status = 'trash' ORDER BY created_at DESC");
        } else if ($folder === 'sent') {
            $stmt = $pdo->query("SELECT * FROM contact_messages WHERE status = 'replied' ORDER BY created_at DESC");
        } else if ($folder === 'all') {
            $stmt = $pdo->query("SELECT * FROM contact_messages ORDER BY created_at DESC");
        } else {
            $stmt = $pdo->query("SELECT * FROM contact_messages WHERE status NOT IN ('trash', 'replied') ORDER BY created_at DESC");
        }
        echo json_encode($stmt->fetchAll());
        break;

    case 'update_contact_message_status':
        $status = $input['status'];
        $id = $input['id'];
        $replyContent = $input['reply_content'] ?? null;
        
        if ($replyContent) {
            $stmt = $pdo->prepare("UPDATE contact_messages SET status = ?, reply_content = ? WHERE id = ?");
            $stmt->execute([$status, $replyContent, $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE contact_messages SET status = ? WHERE id = ?");
            $stmt->execute([$status, $id]);
        }
        echo json_encode(["success" => true]);
        break;

    case 'save_notification':
        $n = $input['notification'] ?? $input;
        $sql = "INSERT INTO notifications (id, type, title, message, entity_id, link, `read`) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$n['id'] ?? uniqid(), $n['type'] ?? 'system', $n['title'], $n['message'], 
                        $n['entity_id'] ?? null, $n['link'] ?? null, $n['read'] ?? 0]);
        echo json_encode(["success" => true]);
        break;

    case 'get_audit_logs':
        $searchTerm = $input['search'] ?? $_GET['search'] ?? '';
        $severity = $input['severity'] ?? $_GET['severity'] ?? 'all';
        $page = (int)($input['page'] ?? $_GET['page'] ?? 1);
        $pageSize = (int)($input['page_size'] ?? $_GET['page_size'] ?? 15);
        $offset = ($page - 1) * $pageSize;

        $where = [];
        $params = [];

        if ($searchTerm) {
            $where[] = "(action LIKE ? OR entity_type LIKE ? OR customer_phone LIKE ? OR details LIKE ?)";
            $params[] = "%$searchTerm%";
            $params[] = "%$searchTerm%";
            $params[] = "%$searchTerm%";
            $params[] = "%$searchTerm%";
        }

        // Map severity to entity_type/action logic if severity filter is used
        if ($severity !== 'all') {
            if ($severity === 'CRITICAL') {
                $where[] = "entity_type = 'system'";
            } elseif ($severity === 'WARNING') {
                $where[] = "entity_type = 'purchase'";
            } elseif ($severity === 'ERROR') {
                $where[] = "(action LIKE '%ERROR%' OR action LIKE '%FAIL%')";
            }
        }

        $whereClause = count($where) > 0 ? "WHERE " . implode(" AND ", $where) : "";
        
        // Get total count for pagination
        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM audit_logs $whereClause");
        $countStmt->execute($params);
        $totalCount = $countStmt->fetchColumn();

        // Get logs
        $sql = "SELECT a.*, t.name as user_name, t.role as user_role, t.email as user_email 
                FROM audit_logs a 
                LEFT JOIN team_members t ON a.user_id = t.id 
                $whereClause 
                ORDER BY a.created_at DESC LIMIT $pageSize OFFSET $offset";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $logs = $stmt->fetchAll();

        echo json_encode([
            "success" => true,
            "data" => $logs,
            "total" => (int)$totalCount,
            "page" => $page,
            "page_size" => $pageSize
        ]);
        break;

    case 'get_receipts':
        $stmt = $pdo->query("SELECT * FROM receipts ORDER BY created_at DESC LIMIT 100");
        echo json_encode($stmt->fetchAll());
        break;

    case 'save_receipt':
        $r = $input['receipt'] ?? $input;
        $sql = "INSERT INTO receipts (id, receipt_no, order_id, customer_id, amount, payment_method, cashier_id, items, tax_amount, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE amount=VALUES(amount), payment_method=VALUES(payment_method), status=VALUES(status)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $r['id'] ?? uniqid(),
            $r['receipt_no'] ?? ('PC-'.date('Ymd').'-'.rand(100,999)),
            $r['order_id'] ?? null,
            $r['customer_id'] ?? null,
            $r['amount'] ?? 0,
            $r['payment_method'] ?? 'cash',
            $r['cashier_id'] ?? null,
            is_array($r['items'] ?? null) ? json_encode($r['items']) : ($r['items'] ?? '[]'),
            $r['tax_amount'] ?? 0,
            $r['status'] ?? 'paid'
        ]);
        echo json_encode(['success' => true]);
        break;

    case 'get_cash_sessions':
        $stmt = $pdo->query("SELECT * FROM cash_sessions ORDER BY opened_at DESC LIMIT 50");
        echo json_encode($stmt->fetchAll());
        break;

    case 'save_cash_session':
        $sql = "INSERT INTO cash_sessions (id, opened_by, opening_balance, status) VALUES (?, ?, ?, 'open')";
        $stmt = $pdo->prepare($sql);
        $id = uniqid();
        $stmt->execute([$id, $input['opened_by'], $input['opening_balance']]);
        echo json_encode(['success' => true, 'id' => $id]);
        break;

    case 'update_cash_session':
        $stmt = $pdo->prepare("UPDATE cash_sessions SET closing_balance = ?, closed_at = NOW(), status = 'closed', notes = ? WHERE id = ?");
        $stmt->execute([$input['closing_balance'], $input['notes'] ?? '', $input['id']]);
        echo json_encode(['success' => true]);
        break;

    case 'purge_database':
        $tables = ['order_items', 'audit_logs', 'sms_logs', 'queue_tickets', 'orders', 'customers', 'contact_messages', 'cash_sessions', 'work_sessions'];
        try {
            $pdo->beginTransaction();
            foreach ($tables as $table) {
                $pdo->exec("DELETE FROM `$table` WHERE id != '00000000-0000-0000-0000-000000000000'");
            }
            $pdo->commit();
            echo json_encode(["success" => true]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'log_notification':
        $stmt = $pdo->prepare("INSERT INTO sms_logs (type, recipient, content, status, created_at) VALUES (?, ?, ?, ?, NOW())");
        $stmt->execute([$input['type'], $input['recipient'], $input['content'], $input['status']]);
        echo json_encode(['success' => true]);
        break;

    case 'get_sms_logs':
        $limit = $input['limit'] ?? 200;
        $stmt = $pdo->prepare("SELECT * FROM sms_logs ORDER BY created_at DESC LIMIT ?");
        $stmt->bindValue(1, (int)$limit, PDO::PARAM_INT);
        $stmt->execute();
        echo json_encode($stmt->fetchAll());
        break;

    case 'send_email':
        $resend_key = "re_P7j69cGh_572YUfnaJMSJJXFNQ7HWPthF";
        $to = is_array($input['to']) ? $input['to'] : [$input['to']];
        $from = $input['from'] ?? "Pão Caseiro <sistema@paocaseiro.co.mz>";
        $payload = [
            "from" => $from,
            "to" => $to,
            "subject" => $input['subject'],
            "html" => $input['html']
        ];
        if (!empty($input['reply_to'])) $payload['reply_to'] = $input['reply_to'];
        if (!empty($input['bcc'])) $payload['bcc'] = is_array($input['bcc']) ? $input['bcc'] : [$input['bcc']];
        if (!empty($input['attachments'])) $payload['attachments'] = $input['attachments'];
        
        $send_request = function($p) use ($resend_key) {
            $ch = curl_init('https://api.resend.com/emails');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($p));
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Fix for local/Hostinger SSL cert issues
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                "Authorization: Bearer $resend_key",
                "Content-Type: application/json"
            ]);
            $res = curl_exec($ch);
            $err = curl_error($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($err) {
                return ['body' => ['error' => "cURL Error: $err"], 'code' => 500];
            }
            
            return ['body' => json_decode($res, true), 'code' => $code];
        };

        $result = $send_request($payload);
        
        // Fallback for Sandbox/Unverified domain
        if ($result['code'] === 403 || ($result['code'] === 422 && strpos(json_encode($result['body']), 'sandbox') !== false)) {
            $payload['from'] = 'Pão Caseiro <onboarding@resend.dev>';
            $result = $send_request($payload);
        }
        
        echo json_encode($result['body']);
        break;

    case 'send_sms':
        $turbo_token = "WTJlMzZpeDNNb25WR3hZK0NhcG1DUT09";
        $payload = [
            "user_token" => $turbo_token,
            "number" => $input['number'],
            "message" => $input['message']
        ];
        
        $ch = curl_init('https://my.turbo.host/api/international-sms/submit');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Content-Type: application/json"
        ]);
        
        $response = curl_exec($ch);
        curl_close($ch);
        echo $response;
        break;

    case 'generate_ticket':
        $phone = $input['phone'] ?? null;
        $userId = $input['user_id'] ?? null;
        $priority = $input['is_priority'] ?? false;
        $category = $input['category'] ?? 'Geral';
        
        // Get next ticket number for today
        $stmt = $pdo->query("SELECT MAX(ticket_number) as last_num FROM queue_tickets WHERE DATE(created_at) = CURDATE()");
        $last = $stmt->fetch();
        $nextNum = ($last['last_num'] ?? 0) + 1;
        
        $sql = "INSERT INTO queue_tickets (ticket_number, phone, user_id, is_priority, category, status) VALUES (?, ?, ?, ?, ?, 'waiting')";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$nextNum, $phone, $userId, $priority ? 1 : 0, $category]);
        
        $newId = $pdo->lastInsertId();
        $stmt = $pdo->prepare("SELECT * FROM queue_tickets WHERE id = ?");
        $stmt->execute([$newId]);
        echo json_encode(['success' => true, 'data' => $stmt->fetch()]);
        break;

    case 'get_active_ticket':
        $idnt = $input['identifier'] ?? '';
        $stmt = $pdo->prepare("SELECT * FROM queue_tickets WHERE (phone = ? OR user_id = ?) AND status = 'waiting' ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([$idnt, $idnt]);
        echo json_encode(['success' => true, 'data' => $stmt->fetch()]);
        break;

    case 'get_queue_count':
        $createdAt = $input['created_at'] ?? date('Y-m-d H:i:s');
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM queue_tickets WHERE status = 'waiting' AND created_at < ?");
        $stmt->execute([$createdAt]);
        echo json_encode(['success' => true, 'data' => $stmt->fetch()]);
        break;

    case 'get_tickets_today':
        $stmt = $pdo->query("SELECT * FROM queue_tickets WHERE DATE(created_at) = CURDATE() ORDER BY created_at DESC");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'update_ticket_status':
        $id = $input['id'] ?? '';
        $status = $input['status'] ?? 'called';
        $counter = $input['counter'] ?? null;
        $stmt = $pdo->prepare("UPDATE queue_tickets SET status = ?, counter = ?, called_at = NOW() WHERE id = ?");
        $stmt->execute([$status, $counter, $id]);
        echo json_encode(['success' => true]);
        break;

    case 'reset_today_queue':
        $stmt = $pdo->query("UPDATE queue_tickets SET status = 'cancelled' WHERE DATE(created_at) = CURDATE() AND status = 'waiting'");
        echo json_encode(['success' => true]);
        break;

    case 'save_contact_message':
        $stmt = $pdo->prepare("INSERT INTO contact_messages (name, phone, email, message, status) VALUES (?, ?, ?, ?, 'unread')");
        $stmt->execute([
            $input['name'] ?? '',
            $input['phone'] ?? '',
            $input['email'] ?? '',
            $input['message'] ?? ''
        ]);
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        break;

    case 'subscribe_newsletter':
        $stmt = $pdo->prepare("INSERT INTO newsletter_subscribers (id, name, email) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)");
        $stmt->execute([$input['id'] ?? uniqid(), $input['name'], $input['email']]);
        echo json_encode(['success' => true]);
        break;
    
    case 'get_newsletter_subscribers':
        $stmt = $pdo->query("SELECT * FROM newsletter_subscribers ORDER BY created_at DESC");
        echo json_encode($stmt->fetchAll());
        break;

    case 'delete_newsletter_subscriber':
        $stmt = $pdo->prepare("DELETE FROM newsletter_subscribers WHERE id = ?");
        $stmt->execute([$input['id']]);
        echo json_encode(['success' => true]);
        break;

    // --- BLOG ---
    case 'get_blog_posts':
        $stmt = $pdo->query("SELECT * FROM blog_posts ORDER BY created_at DESC");
        echo json_encode($stmt->fetchAll());
        break;

    case 'save_blog_post':
        $p = $input['post'] ?? $input;
        $sql = "INSERT INTO blog_posts (id, title, excerpt, content, image_url, author_name, category, read_time, tags, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE title=VALUES(title), excerpt=VALUES(excerpt), content=VALUES(content), 
                image_url=VALUES(image_url), author_name=VALUES(author_name), category=VALUES(category), 
                read_time=VALUES(read_time), tags=VALUES(tags), status=VALUES(status)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $p['id'] ?? uniqid(), $p['title'], $p['excerpt'] ?? '', $p['content'], 
            $p['image_url'] ?? '', $p['author_name'] ?? 'Pão Caseiro', $p['category'] ?? 'Geral', 
            $p['read_time'] ?? '5 min', is_array($p['tags'] ?? null) ? json_encode($p['tags']) : ($p['tags'] ?? '[]'),
            $p['status'] ?? 'published'
        ]);
        echo json_encode(['success' => true]);
        break;

    case 'delete_blog_post':
        $stmt = $pdo->prepare("DELETE FROM blog_posts WHERE id = ?");
        $stmt->execute([$input['id']]);
        echo json_encode(['success' => true]);
        break;

    case 'get_blog_comments':
        $postId = $input['post_id'] ?? null;
        if ($postId) {
            $stmt = $pdo->prepare("SELECT * FROM blog_comments WHERE post_id = ? ORDER BY created_at DESC");
            $stmt->execute([$postId]);
        } else {
            $stmt = $pdo->query("SELECT * FROM blog_comments ORDER BY created_at DESC");
        }
        echo json_encode($stmt->fetchAll());
        break;

    case 'save_blog_comment':
        $c = $input['comment'] ?? $input;
        $sql = "INSERT INTO blog_comments (id, post_id, author_name, author_email, content, status) VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $c['id'] ?? uniqid(), $c['post_id'], $c['author_name'], $c['author_email'], $c['content'], $c['status'] ?? 'approved'
        ]);
        echo json_encode(['success' => true]);
        break;

    case 'delete_blog_comment':
        $stmt = $pdo->prepare("DELETE FROM blog_comments WHERE id = ?");
        $stmt->execute([$input['id']]);
        echo json_encode(['success' => true]);
        break;

    case 'get_email_campaigns':
        $stmt = $pdo->query("SELECT * FROM email_campaigns ORDER BY created_at DESC");
        echo json_encode($stmt->fetchAll());
        break;

    case 'save_email_campaign':
        $cam = $input['campaign'] ?? $input;
        $id = $cam['id'] ?? uniqid();
        $sql = "INSERT INTO email_campaigns (id, subject, title, content, status, target_count, sent_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                subject = VALUES(subject), title = VALUES(title), content = VALUES(content), 
                status = VALUES(status), target_count = VALUES(target_count), sent_at = VALUES(sent_at)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $id, $cam['subject'], $cam['title'], $cam['content'], 
            $cam['status'] ?? 'draft', $cam['target_count'] ?? 0, $cam['sent_at'] ?? null
        ]);
        
        $stmt = $pdo->prepare("SELECT * FROM email_campaigns WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    case 'delete_email_campaign':
        $stmt = $pdo->prepare("DELETE FROM email_campaigns WHERE id = ?");
        $stmt->execute([$input['id']]);
        echo json_encode(['success' => true]);
        break;

    // --- GALLERY ---
    case 'save_gallery_item':
        $item = $input['item'] ?? $input;
        $sql = "INSERT INTO gallery_items (id, title, image_url, category, description) VALUES (?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $item['id'] ?? uniqid(), $item['title'] ?? '', $item['image_url'], $item['category'] ?? 'Geral', $item['description'] ?? ''
        ]);
        echo json_encode(['success' => true]);
        break;

    case 'delete_gallery_item':
        $stmt = $pdo->prepare("DELETE FROM gallery_items WHERE id = ?");
        $stmt->execute([$input['id']]);
        echo json_encode(['success' => true]);
        break;

    case 'get_ai_insights':
        $stmt = $pdo->query("SELECT * FROM ai_insights ORDER BY created_at DESC LIMIT 50");
        echo json_encode($stmt->fetchAll());
        break;

    case 'save_ai_insight':
        $insight = $input['insight'] ?? $input;
        $stmt = $pdo->prepare("INSERT INTO ai_insights (title, description, category, priority, recommendation) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([
            $insight['title'],
            $insight['description'],
            $insight['category'],
            $insight['priority'],
            $insight['recommendation']
        ]);
        echo json_encode(['success' => true]);
        break;

    case 'test_email':
        $to = $input['to'] ?? 'geral@paocaseiro.co.mz';
        $result = send_resend_email($to, 'Teste de Email Pão Caseiro', '<h1>Funcionando!</h1><p>Este é um teste de entrega da ponte PHP.</p>');
        echo json_encode(['success' => $result !== false, 'result' => $result]);
        break;

    // --- DRIVE MANAGEMENT ---
    case 'get_drive_folders':
        $parentId = $input['parent_id'] ?? null;
        $sql = $parentId ? "SELECT * FROM drive_folders WHERE parent_id = ? ORDER BY name" : "SELECT * FROM drive_folders WHERE parent_id IS NULL ORDER BY name";
        $stmt = $pdo->prepare($sql);
        if ($parentId) $stmt->execute([$parentId]);
        else $stmt->execute();
        echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        break;

    case 'save_drive_folder':
        $name = $input['name'];
        $parentId = $input['parent_id'] ?? null;
        $id = $input['id'] ?? uniqid();
        $stmt = $pdo->prepare("INSERT INTO drive_folders (id, name, parent_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)");
        $stmt->execute([$id, $name, $parentId]);
        echo json_encode(["success" => true, "id" => $id]);
        break;

    case 'delete_drive_folder':
        $id = $input['id'];
        $stmt = $pdo->prepare("DELETE FROM drive_folders WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["success" => true]);
        break;

    case 'get_drive_files':
        $folderId = $input['folder_id'] ?? null;
        $sql = $folderId ? "SELECT * FROM drive_files WHERE folder_id = ? ORDER BY created_at DESC" : "SELECT * FROM drive_files WHERE folder_id IS NULL ORDER BY created_at DESC";
        $stmt = $pdo->prepare($sql);
        if ($folderId) $stmt->execute([$folderId]);
        else $stmt->execute();
        echo json_encode(["success" => true, "data" => $stmt->fetchAll()]);
        break;

    case 'save_drive_file':
        $f = $input['file'] ?? $input;
        $sql = "INSERT INTO drive_files (id, name, path, size, type, folder_id, uploaded_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?) 
                ON DUPLICATE KEY UPDATE name=VALUES(name), path=VALUES(path), size=VALUES(size), folder_id=VALUES(folder_id)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $f['id'] ?? uniqid(),
            $f['name'],
            $f['path'],
            $f['size'] ?? 0,
            $f['type'] ?? 'application/octet-stream',
            $f['folder_id'] ?? null,
            $f['uploaded_by'] ?? 'admin'
        ]);
        echo json_encode(["success" => true]);
        break;

    case 'delete_drive_file':
        $id = $input['id'];
        // Note: Real file deletion from disk could be added here if needed
        $stmt = $pdo->prepare("DELETE FROM drive_files WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["success" => true]);
        break;

    case 'upload_drive_file':
        if (!isset($_FILES['file'])) {
            echo json_encode(["error" => "No file uploaded"]);
            break;
        }
        $file = $_FILES['file'];
        $folderId = $_POST['folder_id'] ?? null;
        $uploadedBy = $_POST['uploaded_by'] ?? 'admin';
        
        $uploadDir = 'uploads/drive/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
        
        $fileName = time() . '_' . basename($file['name']);
        $targetPath = $uploadDir . $fileName;
        
        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            $id = uniqid();
            $stmt = $pdo->prepare("INSERT INTO drive_files (id, name, path, size, type, folder_id, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $id,
                $file['name'],
                $targetPath,
                $file['size'],
                $file['type'],
                $folderId,
                $uploadedBy
            ]);
            echo json_encode(["success" => true, "id" => $id, "path" => $targetPath]);
        } else {
            echo json_encode(["error" => "Failed to move uploaded file"]);
        }
        break;

    case 'register_drive_file':
        $f = $input['file'] ?? $input;
        $cols = [];
        $vals = [];
        $placeholders = [];
        foreach ($f as $key => $val) {
            if ($key === 'action') continue;
            $cols[] = "`$key`";
            $vals[] = $val;
            $placeholders[] = "?";
        }
        $sql = "INSERT INTO drive_files (" . implode(',', $cols) . ") VALUES (" . implode(',', $placeholders) . ")";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($vals);
        echo json_encode(["success" => true, "id" => $pdo->lastInsertId()]);
        break;

    case 'process_payment':

        try {
            $payload = $input['payload'] ?? $input;
            $action = $payload['action'] ?? 'initiate';
            
            // This is a proxy to the payment gateway (PaySuite)
            // In a real scenario, you'd use CURL to call the gateway API here.
            // For now, we'll simulate the response if in sandbox mode or implement the CURL.
            
            $url = "https://api.paysuite.co.mz/v1/payments"; // Mock/Real URL
            if ($action === 'verify') {
                $url .= "/verify/" . $payload['id'];
            }

            // Simulated success for now to keep the flow working during migration
            // In production, implement real CURL here.
            if ($action === 'initiate') {
                $orderId = $payload['reference'];
                echo json_encode([
                    "success" => true,
                    "data" => [
                        "checkout_url" => "https://paocaseiro.co.mz/payment-simulator?ref=" . $orderId,
                        "id" => "TX_" . uniqid(),
                        "status" => "PENDING"
                    ]
                ]);
            } else {
                echo json_encode([
                    "success" => true,
                    "data" => [
                        "status" => "PAID",
                        "id" => $payload['id']
                    ]
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'get_ai_insights':
        try {
            $prompt = $input['prompt'] ?? '';
            $systemContext = $input['systemContext'] ?? 'Você é a Zyph AI.';
            
            $openRouterKey = "REPLACE_WITH_OPENROUTER_KEY"; 
            
            $ch = curl_init("https://openrouter.ai/api/v1/chat/completions");
            $data = [
                "model" => "google/gemini-2.0-flash-001",
                "messages" => [
                    ["role" => "system", "content" => $systemContext],
                    ["role" => "user", "content" => $prompt]
                ]
            ];

            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                "Content-Type: application/json",
                "Authorization: Bearer $openRouterKey"
            ]);

            $response = curl_exec($ch);
            curl_close($ch);
            
            $resData = json_decode($response, true);
            echo json_encode(["success" => true, "data" => $resData]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'analyze_audit_logs':

        try {
            // Fetch recent critical/warning logs to analyze
            $stmt = $pdo->query("SELECT * FROM audit_logs WHERE entity_type IN ('system', 'security', 'auth') OR action LIKE '%ERROR%' ORDER BY created_at DESC LIMIT 20");
            $logs = $stmt->fetchAll();
            
            $logSummary = "";
            foreach ($logs as $l) {
                $logSummary .= "[{$l['created_at']}] {$l['action']} - {$l['entity_type']}: {$l['details']}\n";
            }

            // Call LLM (OpenRouter)
            $openRouterKey = "REPLACE_WITH_OPENROUTER_KEY"; // Example key, should be in env
            
            $ch = curl_init("https://openrouter.ai/api/v1/chat/completions");
            $prompt = "Você é um especialista em segurança e auditoria da padaria Pão Caseiro. 
                       Analise os seguintes logs de auditoria e forneça um relatório conciso com:
                       1. Nível de risco atual.
                       2. Principais anomalias ou falhas de segurança/operação.
                       3. Recomendações imediatas.
                       
                       Logs:\n" . $logSummary;

            $data = [
                "model" => "google/gemini-2.0-flash-001",
                "messages" => [
                    ["role" => "system", "content" => "Analista de Segurança Pão Caseiro"],
                    ["role" => "user", "content" => $prompt]
                ]
            ];

            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                "Content-Type: application/json",
                "Authorization: Bearer $openRouterKey"
            ]);

            $response = curl_exec($ch);
            curl_close($ch);
            
            $resData = json_decode($response, true);
            $report = $resData['choices'][0]['message']['content'] ?? "Não foi possível gerar a análise no momento.";

            echo json_encode(["success" => true, "report" => $report]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'export_database':
        try {
            $tables = ['products', 'customers', 'orders', 'order_items', 'receipts', 'team_members', 'audit_logs'];
            $exportData = [];
            foreach ($tables as $table) {
                $stmt = $pdo->query("SELECT * FROM $table");
                $exportData[$table] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            echo json_encode(['success' => true, 'data' => $exportData]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'purge_database':
        try {
            // Need to disable foreign key checks temporarily if there are constraints, but better to clear in correct order
            // If using Hostinger DB, let's clear them:
            $tablesToClear = ['order_items', 'receipts', 'audit_logs', 'orders', 'customers'];
            foreach ($tablesToClear as $table) {
                $pdo->exec("DELETE FROM $table WHERE id != '00000000-0000-0000-0000-000000000000'");
            }
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(404);
        echo json_encode(["error" => "Ação não encontrada: " . $action]);
        break;
}

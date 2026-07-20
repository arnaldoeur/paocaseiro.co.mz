<?php
// public/paocaseiro_db.php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

// Resposta para Preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

// CONFIGURAÇÕES DE SEGURANÇA
$API_KEY = "PaoCaseiro_Direct_MySQL_2026"; // Chave de segurança para o frontend
$PAYSUITE_TOKEN = "1947|o1MrK0BSreKHZFH82ym7DFIm7EaVgveafTBcnTgr38985c43"; // Chave real da dashboard da PaySuite
$PAYSUITE_WEBHOOK_SECRET = "whsec_c6df7d4376c281e30536e1aa4580807a9783362a85826574"; // Secret para verificar assinaturas de webhooks

// Log function for debugging
function debug_log($message) {
    $formatted = (is_array($message) || is_object($message)) ? json_encode($message) : $message;
    // Standard server logging
    error_log("[PaoCaseiro DB] " . $formatted);
    // Explicit local file fallback to guarantee access on shared hosting
    $logMsg = "[" . date('Y-m-d H:i:s') . " UTC] [PaoCaseiro DB] " . $formatted . "\n";
    @file_put_contents(__DIR__ . '/error_log', $logMsg, FILE_APPEND);
}

// Helper function to resolve the persistent uploads directory
function get_persistent_upload_dir($targetFolder = 'drive') {
    $isLocal = (strpos($_SERVER['HTTP_HOST'] ?? '', 'localhost') !== false) || 
               (strpos($_SERVER['HTTP_HOST'] ?? '', '127.0.0.1') !== false);
               
    if ($isLocal) {
        $dir = __DIR__ . '/uploads/' . $targetFolder . '/';
    } else {
        $dirPath = __DIR__;
        if (strpos($dirPath, 'public_html') !== false) {
            $parts = explode('public_html', $dirPath);
            $parentOfPublicHtml = rtrim($parts[0], '/\\');
            $dir = $parentOfPublicHtml . '/paocaseiro_uploads/' . $targetFolder . '/';
        } else {
            $dir = dirname(dirname(__DIR__)) . '/paocaseiro_uploads/' . $targetFolder . '/';
        }
    }
    
    $dir = str_replace('\\', '/', $dir);
    return $dir;
}

// CREDENCIAIS DA HOSTINGER
$isLocal = strpos($_SERVER['HTTP_HOST'] ?? '', 'localhost') !== false;
$host = $isLocal ? "72.60.122.110" : "127.0.0.1";
$port = "3306";
$user = "u178468876_nazir";
$pass = "@Pcaseiro25";
$db   = "u178468876_pcaseiro";

function get_pdo_connection() {
    global $host, $port, $db, $user, $pass;
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 5,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ];
    try {
        $conn = new PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4", $user, $pass, $options);
        
        // Self-healing migration for missing columns
        static $migrated = false;
        if (!$migrated && $conn) {
            $migrated = true;
            try {
                // Ensure queue_tickets table exists and has 'priority' column
                $tableCheck = $conn->query("SHOW TABLES LIKE 'queue_tickets'")->rowCount();
                if ($tableCheck === 0) {
                    $conn->exec("CREATE TABLE queue_tickets (
                        id VARCHAR(50) PRIMARY KEY,
                        customer_phone VARCHAR(50) NULL,
                        user_id VARCHAR(50) NULL,
                        ticket_number INT NOT NULL,
                        priority TINYINT(1) DEFAULT 0,
                        category VARCHAR(50) DEFAULT 'Geral',
                        status VARCHAR(50) DEFAULT 'waiting',
                        counter INT NULL,
                        called_at TIMESTAMP NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )");
                } else {
                    $colCheck = $conn->query("SHOW COLUMNS FROM queue_tickets LIKE 'priority'")->rowCount();
                    if ($colCheck === 0) {
                        $conn->exec("ALTER TABLE queue_tickets ADD COLUMN priority TINYINT(1) DEFAULT 0 AFTER ticket_number");
                    }
                }

                // Ensure cash_sessions table exists
                $sessionCheck = $conn->query("SHOW TABLES LIKE 'cash_sessions'")->rowCount();
                if ($sessionCheck === 0) {
                    $conn->exec("CREATE TABLE cash_sessions (
                        id VARCHAR(50) PRIMARY KEY,
                        opened_by VARCHAR(50) NOT NULL,
                        opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        closing_balance DECIMAL(10,2) DEFAULT NULL,
                        status VARCHAR(20) NOT NULL DEFAULT 'open',
                        notes TEXT DEFAULT NULL,
                        opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        closed_at TIMESTAMP NULL DEFAULT NULL
                    )");
                }

                // Ensure system_settings table exists
                $settingsCheck = $conn->query("SHOW TABLES LIKE 'system_settings'")->rowCount();
                if ($settingsCheck === 0) {
                    $conn->exec("CREATE TABLE system_settings (
                        `key` VARCHAR(100) PRIMARY KEY,
                        `value` LONGTEXT NOT NULL
                    )");
                }

                // Seed ticket_customization setting if not exists
                $customCheck = $conn->query("SELECT COUNT(*) FROM system_settings WHERE `key` = 'ticket_customization'")->fetchColumn();
                if ($customCheck == 0) {
                    $defaultCustom = json_encode([
                        "logo_url" => "/assets/ui/logo.png",
                        "company_name" => "PÃO CASEIRO",
                        "header" => "Queue Management System",
                        "footer" => "Lichinga, Niassa • Tel: +258 87 9146 662",
                        "thanks_msg" => "O Sabor que Aquece o Coração",
                        "font_size_title" => "large",
                        "font_size_number" => "double",
                        "text_align" => "center",
                        "paper_width" => "80mm",
                        "margins" => "0",
                        "qr_visible" => true,
                        "barcode_visible" => true
                    ]);
                    $stmt = $conn->prepare("INSERT INTO system_settings (`key`, `value`) VALUES ('ticket_customization', ?)");
                    $stmt->execute([$defaultCustom]);
                }

                // Ensure orders table has cash_session_id column
                $ordersCheck = $conn->query("SHOW TABLES LIKE 'orders'")->rowCount();
                if ($ordersCheck > 0) {
                    $orderColCheck = $conn->query("SHOW COLUMNS FROM orders LIKE 'cash_session_id'")->rowCount();
                    if ($orderColCheck === 0) {
                        $conn->exec("ALTER TABLE orders ADD COLUMN cash_session_id VARCHAR(50) NULL AFTER user_id");
                    }
                }

                // Ensure contact_messages table exists and has all required columns
                $contactCheck = $conn->query("SHOW TABLES LIKE 'contact_messages'")->rowCount();
                if ($contactCheck === 0) {
                    $conn->exec("CREATE TABLE contact_messages (
                        id VARCHAR(50) PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        phone VARCHAR(50) NOT NULL,
                        email VARCHAR(255) NULL,
                        message TEXT NOT NULL,
                        folder VARCHAR(50) DEFAULT 'inbox',
                        status VARCHAR(50) DEFAULT 'new',
                        reply_content TEXT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )");
                } else {
                    // Check and add missing columns
                    $colFolder = $conn->query("SHOW COLUMNS FROM contact_messages LIKE 'folder'")->rowCount();
                    if ($colFolder === 0) {
                        $conn->exec("ALTER TABLE contact_messages ADD COLUMN folder VARCHAR(50) DEFAULT 'inbox' AFTER message");
                    }
                    
                    $colStatus = $conn->query("SHOW COLUMNS FROM contact_messages LIKE 'status'")->rowCount();
                    if ($colStatus === 0) {
                        $conn->exec("ALTER TABLE contact_messages ADD COLUMN status VARCHAR(50) DEFAULT 'new' AFTER folder");
                    }

                    $colReply = $conn->query("SHOW COLUMNS FROM contact_messages LIKE 'reply_content'")->rowCount();
                    if ($colReply === 0) {
                        $conn->exec("ALTER TABLE contact_messages ADD COLUMN reply_content TEXT NULL AFTER status");
                    }
                }

                // Ensure gallery table exists
                $galleryCheck = $conn->query("SHOW TABLES LIKE 'gallery'")->rowCount();
                if ($galleryCheck === 0) {
                    $conn->exec("CREATE TABLE gallery (
                        id VARCHAR(50) PRIMARY KEY,
                        title VARCHAR(255) NOT NULL,
                        description TEXT NULL,
                        image_url TEXT NOT NULL,
                        category VARCHAR(100) DEFAULT 'General',
                        is_active TINYINT(1) DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )");
                }

                // Ensure blog_posts table exists
                $blogPostsCheck = $conn->query("SHOW TABLES LIKE 'blog_posts'")->rowCount();
                if ($blogPostsCheck === 0) {
                    $conn->exec("CREATE TABLE blog_posts (
                        id VARCHAR(50) PRIMARY KEY,
                        title VARCHAR(255) NOT NULL,
                        slug VARCHAR(255) UNIQUE NOT NULL,
                        content LONGTEXT NOT NULL,
                        excerpt TEXT NULL,
                        image_url TEXT NULL,
                        category VARCHAR(100) NULL,
                        tags TEXT NULL,
                        status VARCHAR(50) DEFAULT 'draft',
                        author VARCHAR(100) DEFAULT 'Admin',
                        seo_title VARCHAR(255) NULL,
                        seo_description TEXT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    )");
                }

                // Ensure blog_comments table exists
                $blogCommentsCheck = $conn->query("SHOW TABLES LIKE 'blog_comments'")->rowCount();
                if ($blogCommentsCheck === 0) {
                    $conn->exec("CREATE TABLE blog_comments (
                        id VARCHAR(50) PRIMARY KEY,
                        post_id VARCHAR(50) NOT NULL,
                        author VARCHAR(100) NOT NULL,
                        content TEXT NOT NULL,
                        user_id VARCHAR(50) NULL,
                        status VARCHAR(50) DEFAULT 'pending',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )");
                }

                // Ensure drive_folders table exists
                $driveFoldersCheck = $conn->query("SHOW TABLES LIKE 'drive_folders'")->rowCount();
                if ($driveFoldersCheck === 0) {
                    $conn->exec("CREATE TABLE drive_folders (
                        id VARCHAR(50) PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        parent_id VARCHAR(50) NULL
                    )");
                }

                // Ensure drive_files table exists
                $driveFilesCheck = $conn->query("SHOW TABLES LIKE 'drive_files'")->rowCount();
                if ($driveFilesCheck === 0) {
                    $conn->exec("CREATE TABLE drive_files (
                        id VARCHAR(50) PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        path VARCHAR(255) NOT NULL,
                        size INT NOT NULL DEFAULT 0,
                        type VARCHAR(100) NULL,
                        folder_id VARCHAR(50) NULL,
                        uploaded_by VARCHAR(100) DEFAULT 'admin',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )");
                }

                // Ensure newsletter_subscribers table exists
                $newsletterCheck = $conn->query("SHOW TABLES LIKE 'newsletter_subscribers'")->rowCount();
                if ($newsletterCheck === 0) {
                    $conn->exec("CREATE TABLE newsletter_subscribers (
                        id VARCHAR(50) PRIMARY KEY,
                        name VARCHAR(255) NULL,
                        email VARCHAR(255) UNIQUE NOT NULL,
                        status VARCHAR(50) DEFAULT 'active',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )");
                }

                // Ensure email_campaigns table exists
                $campaignCheck = $conn->query("SHOW TABLES LIKE 'email_campaigns'")->rowCount();
                if ($campaignCheck === 0) {
                    $conn->exec("CREATE TABLE email_campaigns (
                        id VARCHAR(50) PRIMARY KEY,
                        subject VARCHAR(255) NOT NULL,
                        title VARCHAR(255) NULL,
                        content LONGTEXT NOT NULL,
                        status VARCHAR(50) DEFAULT 'draft',
                        target_count INT DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        sent_at TIMESTAMP NULL DEFAULT NULL
                    )");
                }

                // Ensure logistics_drivers table has lat/lng columns
                $driversTableCheck = $conn->query("SHOW TABLES LIKE 'logistics_drivers'")->rowCount();
                if ($driversTableCheck > 0) {
                    $latCheck = $conn->query("SHOW COLUMNS FROM logistics_drivers LIKE 'lat'")->rowCount();
                    if ($latCheck === 0) {
                        $conn->exec("ALTER TABLE logistics_drivers ADD COLUMN lat DECIMAL(10, 8) NULL");
                    }
                    $lngCheck = $conn->query("SHOW COLUMNS FROM logistics_drivers LIKE 'lng'")->rowCount();
                    if ($lngCheck === 0) {
                        $conn->exec("ALTER TABLE logistics_drivers ADD COLUMN lng DECIMAL(11, 8) NULL");
                    }
                }

                // Ensure orders table has driver_lat/driver_lng columns
                $ordersTableCheck = $conn->query("SHOW TABLES LIKE 'orders'")->rowCount();
                if ($ordersTableCheck > 0) {
                    $driverLatCheck = $conn->query("SHOW COLUMNS FROM orders LIKE 'driver_lat'")->rowCount();
                    if ($driverLatCheck === 0) {
                        $conn->exec("ALTER TABLE orders ADD COLUMN driver_lat DECIMAL(10, 8) NULL");
                    }
                    $driverLngCheck = $conn->query("SHOW COLUMNS FROM orders LIKE 'driver_lng'")->rowCount();
                    if ($driverLngCheck === 0) {
                        $conn->exec("ALTER TABLE orders ADD COLUMN driver_lng DECIMAL(11, 8) NULL");
                    }
                }
            } catch (Exception $e) {
                // Silently ignore schema check errors
                error_log("[PaoCaseiro Schema Auto-Heal Error] " . $e->getMessage());
            }
        }
        
        return $conn;
    } catch (PDOException $e) {
        debug_log("PDO Connection Error: " . $e->getMessage());
        return null;
    }
}

function safe_query($sql, $params = []) {
    global $pdo;
    if (!$pdo) {
        $pdo = get_pdo_connection();
        if (!$pdo) throw new Exception("Database connection unavailable.");
    }
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'gone away') !== false || strpos($e->getMessage(), 'connection') !== false) {
            debug_log("MySQL connection lost during query, reconnecting...");
            $pdo = get_pdo_connection();
            if ($pdo) {
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                return $stmt;
            }
        }
        throw $e;
    }
}

function map_ticket($ticket) {
    if (!$ticket) return $ticket;
    
    $isPriority = isset($ticket['priority']) ? (bool)$ticket['priority'] : false;
    $ticket['is_priority'] = $isPriority;
    
    // Check if ticket_number is already formatted (contains letters/hyphens)
    if (is_string($ticket['ticket_number']) && preg_match('/[a-zA-Z]/', $ticket['ticket_number'])) {
        return $ticket;
    }
    
    // Determine category code
    $category = $ticket['category'] ?? 'Geral';
    $catLower = mb_strtolower(trim($category));
    $prefix = 'G';
    
    if ($catLower === 'padaria') {
        $prefix = 'P';
    } else if ($catLower === 'confeitaria') {
        $prefix = 'C';
    } else if ($catLower === 'café' || $catLower === 'cafe') {
        $prefix = 'F';
    } else if ($catLower === 'lanches') {
        $prefix = 'L';
    }
    
    $numStr = str_pad($ticket['ticket_number'], 2, '0', STR_PAD_LEFT);
    
    if ($isPriority) {
        $ticket['ticket_number'] = "PR-" . $prefix . "-" . $numStr;
    } else {
        $ticket['ticket_number'] = $prefix . "-" . $numStr;
    }
    
    return $ticket;
}


$pdo = get_pdo_connection();

if (!$pdo) {
    http_response_code(500);
    die(json_encode(["error" => "Falha na conexão com Hostinger. Verifique se o servidor MySQL está acessível."]));
}

// PROCESSAMENTO DA REQUISIÇÃO
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? $_GET['action'] ?? '';

// VALIDAÇÃO DE AUTORIZAÇÃO
$all_headers = getallheaders();
$auth = '';

if (isset($all_headers['Authorization'])) {
    $auth = $all_headers['Authorization'];
} elseif (isset($all_headers['authorization'])) {
    $auth = $all_headers['authorization'];
} elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $auth = $_SERVER['HTTP_AUTHORIZATION'];
}

$token = trim(str_ireplace('Bearer ', '', $auth));

// Debug log for troubleshooting (can be removed later)
// debug_log("Headers received: " . json_encode($all_headers));
// debug_log("Auth token extracted: " . $token);

if ($action !== 'paysuite_webhook' && $action !== 'serve_file' && $action !== 'serve_upload' && $token !== $API_KEY) {
    http_response_code(401);
    debug_log("Unauthorized access attempt. Action: $action, Token: $token");
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

// ── INTERNAL NOTIFICATION HELPERS (used by webhook without auth check) ──────
function send_whatsapp_internal($number, $text) {
    $wa_instance = "Pao caseiro";
    $wa_apikey   = "429683C4C977415CAAFCCE10F7D57E11";
    $wa_url      = "https://wa.zyphtech.com";
    $endpoint    = "/message/sendText/" . rawurlencode($wa_instance);
    $payload     = [
        "number"  => $number,
        "text"    => $text,
        "options" => ["delay" => 1200, "presence" => "composing", "linkPreview" => false]
    ];
    $ch = curl_init($wa_url . $endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTPHEADER     => ["Content-Type: application/json", "apikey: $wa_apikey"]
    ]);
    $res = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    return $err ? ['error' => $err] : json_decode($res, true);
}

function send_sms_internal($number, $message) {
    $turbo_token = "WTJlMzZpeDNNb25WR3hZK0NhcG1DUT09";
    $payload = [
        "user_token" => $turbo_token,
        "sender_id"  => "PAOCASEIRO",
        "number"     => $number,
        "message"    => $message
    ];
    $ch = curl_init('https://my.turbo.host/api/international-sms/submit');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTPHEADER     => ["Content-Type: application/json"]
    ]);
    $res = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    return $err ? ['error' => $err] : json_decode($res, true);
}

function send_resend_email($to, $subject, $html) {
    $resend_key = "re_P7j69cGh_572YUfnaJMSJJXFNQ7HWPthF";
    $payload = [
        "from" => "Pão Caseiro <sistema@paocaseiro.co.mz>",
        "to" => is_array($to) ? $to : [$to],
        "subject" => $subject,
        "html" => $html
    ];
    
    $send_request = function($p) use ($resend_key) {
        $ch = curl_init('https://api.resend.com/emails');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($p));
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
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
    
    if ($result['code'] === 403 || ($result['code'] === 422 && strpos(json_encode($result['body']), 'sandbox') !== false)) {
        $payload['from'] = 'Pão Caseiro <onboarding@resend.dev>';
        $result = $send_request($payload);
    }
    
    if ($result['code'] >= 400) {
        return $result['body'] ?: ['message' => 'Erro HTTP ' . $result['code']];
    }
    return $result['body'] ?: true;
}

function broadcast_queue_event($event, $data) {
    $url = 'http://localhost:8080/api/queue-event';
    $payload = json_encode(['event' => $event, 'data' => $data]);
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 2, // fast timeout
        CURLOPT_HTTPHEADER     => ["Content-Type: application/json"]
    ]);
    
    $res = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    
    if ($err) {
        error_log("[Queue Broadcast Error] Failed to broadcast queue event: $err");
        return false;
    }
    return true;
}
// ─────────────────────────────────────────────────────────────────────────────

try {
    switch ($action) {
    // --- PRODUCTS ---
    case 'get_products':
        $stmt = safe_query("SELECT * FROM products ORDER BY category, name");
        echo json_encode($stmt->fetchAll());
        break;

    case 'ping':
        echo json_encode(["success" => true, "message" => "Pong! Conectado com sucesso.", "time" => date('Y-m-d H:i:s')]);
        break;

    case 'search_places':
        $q = $input['q'] ?? $_GET['q'] ?? '';
        if (empty($q)) {
            echo json_encode([]);
            break;
        }
        
        $url = "https://nominatim.openstreetmap.org/search?format=json&q=" . urlencode($q) . "&countrycodes=mz&limit=5&addressdetails=1";
        
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_HTTPHEADER     => [
                "User-Agent: PaoCaseiroApp/1.0 (nazir@paocaseiro.co.mz)",
                "Accept-Language: pt-PT,pt;q=0.9"
            ]
        ]);
        $res = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);
        
        if ($err) {
            echo json_encode(["error" => $err]);
        } else {
            // Check if returned data is valid JSON before sending
            $jsonTest = json_decode($res);
            if (json_last_error() === JSON_ERROR_NONE) {
                echo $res;
            } else {
                echo json_encode(["error" => "Invalid response from search service"]);
            }
        }
        break;

    case 'serve_file':
        $fileId = $_GET['id'] ?? $input['id'] ?? '';
        if (empty($fileId)) {
            http_response_code(400);
            die(json_encode(["error" => "File ID missing"]));
        }
        $stmt = $pdo->prepare("SELECT * FROM drive_files WHERE id = ?");
        $stmt->execute([$fileId]);
        $fileRecord = $stmt->fetch();
        if (!$fileRecord) {
            http_response_code(404);
            die(json_encode(["error" => "File not found"]));
        }
        
        $filePath = $fileRecord['path'];
        $parts = explode('/', $filePath);
        $folder = (count($parts) >= 2) ? $parts[count($parts)-2] : 'drive';
        $fileName = basename($filePath);
        
        $absoluteDir = get_persistent_upload_dir($folder);
        $resolvedPath = $absoluteDir . $fileName;
        
        // If the file doesn't exist in the persistent directory, try the relative path as a fallback
        if (!file_exists($resolvedPath)) {
            $resolvedPath = __DIR__ . '/' . $filePath;
        }
        
        if (!file_exists($resolvedPath)) {
            http_response_code(404);
            die("File content not found on disk: " . $resolvedPath);
        }
        
        // Clear headers to avoid any JSON header leak from previous outputs
        while (ob_get_level()) {
            ob_end_clean();
        }
        
        // Serve the file with correct content type
        header("Content-Type: " . ($fileRecord['type'] ?? 'application/octet-stream'));
        header("Content-Length: " . filesize($resolvedPath));
        header("Content-Disposition: inline; filename=\"" . basename($fileRecord['name']) . "\"");
        header("Cache-Control: public, max-age=86400");
        readfile($resolvedPath);
        exit;

    case 'serve_upload':
        $path = $_GET['path'] ?? $input['path'] ?? '';
        if (empty($path)) {
            http_response_code(400);
            die("Path is required");
        }
        
        // Sanitize path to prevent directory traversal
        $path = str_replace(array('../', '..\\'), '', $path);
        
        // Extract folder and file name
        $parts = explode('/', $path);
        $fileName = basename($path);
        $folder = (count($parts) >= 2) ? $parts[count($parts)-2] : 'products';
        
        $absoluteDir = get_persistent_upload_dir($folder);
        $resolvedPath = $absoluteDir . $fileName;
        
        // If the file doesn't exist in the persistent directory, try the relative fallback inside public_html
        if (!file_exists($resolvedPath)) {
            $resolvedPath = __DIR__ . '/' . $path;
        }
        
        if (!file_exists($resolvedPath)) {
            http_response_code(404);
            die("File not found on disk: " . $resolvedPath);
        }
        
        // Clear headers
        while (ob_get_level()) {
            ob_end_clean();
        }
        
        // Detect content type
        $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        $contentTypes = [
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'svg' => 'image/svg+xml',
            'pdf' => 'application/pdf',
            'txt' => 'text/plain',
            'html' => 'text/html'
        ];
        $contentType = $contentTypes[$ext] ?? 'application/octet-stream';
        
        header("Content-Type: " . $contentType);
        header("Content-Length: " . filesize($resolvedPath));
        header("Cache-Control: public, max-age=86400");
        
        readfile($resolvedPath);
        exit;

    case 'bulk_save_products':
        try {
            $pdo->beginTransaction();
            $products = $input['products'] ?? [];
            
            // Get actual columns from DB to avoid errors if schema is missing some fields
            $stmt = $pdo->query("DESCRIBE products");
            $dbColumns = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            foreach ($products as $p) {
                $id = $p['id'] ?? uniqid('prod_');
                
                // Prepare data based on what frontend sends and what DB supports
                $data = [
                    'id' => $id,
                    'name' => $p['name'] ?? null,
                    'name_en' => $p['name_en'] ?? null,
                    'category' => $p['category'] ?? null,
                    'price' => $p['price'] ?? 0,
                    'stock_quantity' => $p['stock_quantity'] ?? $p['stockQuantity'] ?? 0,
                    'is_available' => isset($p['is_available']) ? ($p['is_available'] ? 1 : 0) : (isset($p['inStock']) ? ($p['inStock'] ? 1 : 0) : 1),
                    'image' => $p['image'] ?? null,
                    'unit' => $p['unit'] ?? 'un',
                    'description' => $p['description'] ?? null,
                    'description_en' => $p['description_en'] ?? null,
                    'prep_time' => $p['prep_time'] ?? null,
                    'delivery_time' => $p['delivery_time'] ?? null,
                    'tax_type' => $p['tax_type'] ?? 'standard',
                    'show_in_menu' => isset($p['show_in_menu']) ? ($p['show_in_menu'] ? 1 : 0) : 1,
                    'purchase_price' => $p['purchase_price'] ?? 0,
                    'other_cost' => $p['other_cost'] ?? 0,
                    'margin_percentage' => $p['margin_percentage'] ?? 0,
                    'variations' => isset($p['variations']) ? (is_array($p['variations']) ? json_encode($p['variations']) : $p['variations']) : '[]',
                    'complements' => isset($p['complements']) ? (is_array($p['complements']) ? json_encode($p['complements']) : $p['complements']) : '[]'
                ];

                // Filter data to only include columns that actually exist in the DB
                $finalData = [];
                foreach ($data as $key => $value) {
                    if (in_array($key, $dbColumns)) {
                        $finalData[$key] = $value;
                    }
                }

                $cols = array_keys($finalData);
                $placeholders = array_fill(0, count($cols), "?");
                $updates = [];
                foreach ($cols as $col) {
                    if ($col === 'id') continue;
                    $updates[] = "`$col` = VALUES(`$col`)";
                }

                $sql = "INSERT INTO products (" . implode(', ', $cols) . ") 
                        VALUES (" . implode(', ', $placeholders) . ") 
                        ON DUPLICATE KEY UPDATE " . implode(', ', $updates);
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute(array_values($finalData));
            }
            $pdo->commit();
            echo json_encode(["success" => true, "count" => count($products)]);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
        break;

    case 'save_product':
        $dataInput = $input['product_data'] ?? $input;
        $id = $dataInput['id'];
        
        $stmt = $pdo->query("DESCRIBE products");
        $dbColumns = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $mappedData = [
            'id' => $id,
            'name' => $dataInput['name'],
            'name_en' => $dataInput['name_en'] ?? null,
            'price' => $dataInput['price'],
            'image' => $dataInput['image'] ?? null,
            'category' => $dataInput['category'] ?? null,
            'description' => $dataInput['description'] ?? null,
            'description_en' => $dataInput['description_en'] ?? null,
            'prep_time' => $dataInput['prep_time'] ?? null,
            'delivery_time' => $dataInput['delivery_time'] ?? null,
            'unit' => $dataInput['unit'] ?? 'un',
            'stock_quantity' => $dataInput['stock_quantity'] ?? $dataInput['stockQuantity'] ?? 0,
            'is_available' => isset($dataInput['is_available']) ? ($dataInput['is_available'] ? 1 : 0) : 1,
            'variations' => isset($dataInput['variations']) ? (is_array($dataInput['variations']) ? json_encode($dataInput['variations']) : $dataInput['variations']) : '[]',
            'complements' => isset($dataInput['complements']) ? (is_array($dataInput['complements']) ? json_encode($dataInput['complements']) : $dataInput['complements']) : '[]',
            'tax_type' => $dataInput['tax_type'] ?? 'standard',
            'show_in_menu' => isset($dataInput['show_in_menu']) ? ($dataInput['show_in_menu'] ? 1 : 0) : 1,
            'purchase_price' => $dataInput['purchase_price'] ?? 0,
            'other_cost' => $dataInput['other_cost'] ?? 0,
            'margin_percentage' => $dataInput['margin_percentage'] ?? 0
        ];

        $finalData = [];
        foreach ($mappedData as $key => $value) {
            if (in_array($key, $dbColumns)) {
                $finalData[$key] = $value;
            }
        }

        $cols = array_keys($finalData);
        $placeholders = array_fill(0, count($cols), "?");
        $updates = [];
        foreach ($cols as $col) {
            if ($col === 'id') continue;
            $updates[] = "`$col` = VALUES(`$col`)";
        }

        $sql = "INSERT INTO products (" . implode(', ', $cols) . ") 
                VALUES (" . implode(', ', $placeholders) . ") 
                ON DUPLICATE KEY UPDATE " . implode(', ', $updates);
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute(array_values($finalData));
        echo json_encode(['success' => true]);
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
    case 'get_order':
        $orderId = $input['id'] ?? $_GET['id'] ?? '';
        if (empty($orderId)) {
            http_response_code(400);
            echo json_encode(['error' => 'Order ID required']);
            break;
        }
        // Try exact match first, then short_id
        $stmtO = $pdo->prepare("SELECT o.*, c.name as customer_name_full, c.phone as customer_phone_full FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE o.id = ? OR o.short_id = ? LIMIT 1");
        $stmtO->execute([$orderId, $orderId]);
        $foundOrder = $stmtO->fetch();
        if (!$foundOrder) {
            http_response_code(404);
            echo json_encode(['error' => 'Pedido não encontrado']);
            break;
        }
        $stmtItems = $pdo->prepare("SELECT * FROM order_items WHERE order_id = ?");
        $stmtItems->execute([$foundOrder['id']]);
        $foundOrder['items'] = $stmtItems->fetchAll();
        echo json_encode($foundOrder);
        break;


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
            
            // Clean/sanitize customer name and phone
            $customerName = trim((string)($o['customer_name'] ?? ''));
            if ($customerName === '') {
                $customerName = 'Cliente';
            }
            $customerPhone = trim((string)($o['customer_phone'] ?? ''));

            // 1. Ensure customer exists or update with robust null/empty sanitization
            $customerId = null;
            if (isset($o['customer_id'])) {
                $val = trim((string)$o['customer_id']);
                if ($val !== '' && $val !== 'guest' && $val !== 'null' && $val !== 'undefined') {
                    $customerId = $val;
                }
            }
            
            if ($customerId) {
                $stmtC = $pdo->prepare("INSERT INTO customers (id, name, phone, contact_no, email, address) 
                                       VALUES (?, ?, ?, ?, ?, ?) 
                                       ON DUPLICATE KEY UPDATE name=VALUES(name), last_order_at=NOW()");
                $stmtC->execute([
                    $customerId,
                    $customerName, 
                    $customerPhone, 
                    $customerPhone,
                    $o['customer_email'] ?? null,
                    $o['delivery_address'] ?? null
                ]);
            } else if (!empty($customerPhone) && $customerPhone !== 'N/A' && $customerPhone !== 'undefined' && $customerPhone !== 'null') {
                $stmtExist = $pdo->prepare("SELECT id FROM customers WHERE phone = ? LIMIT 1");
                $stmtExist->execute([$customerPhone]);
                $customerId = $stmtExist->fetchColumn();
                
                if (!$customerId) {
                    $customerId = uniqid('c_');
                    $stmtC = $pdo->prepare("INSERT INTO customers (id, name, phone, contact_no, email, address) VALUES (?, ?, ?, ?, ?, ?)");
                    $stmtC->execute([
                        $customerId,
                        $customerName,
                        $customerPhone,
                        $customerPhone,
                        $o['customer_email'] ?? null,
                        $o['delivery_address'] ?? null
                    ]);
                }
            } else {
                $customerId = null;
            }

            // Secondary double-check to ensure no invalid string bypasses to MySQL
            if (empty($customerId) || $customerId === 'guest' || $customerId === 'null' || $customerId === 'undefined' || trim((string)$customerId) === '') {
                $customerId = null;
            }

            // Check if it's a new order
            $stmtCheckNew = $pdo->prepare("SELECT COUNT(*) FROM orders WHERE id = ?");
            $stmtCheckNew->execute([$orderId]);
            $isNewOrder = ($stmtCheckNew->fetchColumn() == 0);
            
            $shortId = $o['short_id'] ?? strtoupper(substr($orderId, -6));
            if ($isNewOrder) {
                // Ensure short_id is unique
                $stmtCheckShort = $pdo->prepare("SELECT COUNT(*) FROM orders WHERE short_id = ?");
                $stmtCheckShort->execute([$shortId]);
                if ($stmtCheckShort->fetchColumn() > 0) {
                    $attempts = 0;
                    do {
                        $attempts++;
                        $shortId = 'PC-' . str_pad(rand(0, 9999), 4, '0', STR_PAD_LEFT);
                        $stmtCheckShort->execute([$shortId]);
                    } while ($stmtCheckShort->fetchColumn() > 0 && $attempts < 100);
                }
            }

            // 2. Insert/Update Order
            $sql = "INSERT INTO orders (id, short_id, customer_id, customer_name, customer_phone, customer_email, total_amount, amount_paid, balance, status, delivery_type, delivery_address, notes, payment_method, payment_status, payment_reference, transaction_id, estimated_ready_at, cash_session_id) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE status=VALUES(status), payment_status=VALUES(payment_status), payment_reference=VALUES(payment_reference), transaction_id=VALUES(transaction_id), notes=VALUES(notes), estimated_ready_at=VALUES(estimated_ready_at), cash_session_id=VALUES(cash_session_id), amount_paid=VALUES(amount_paid), balance=VALUES(balance)";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $orderId, 
                $shortId,
                $customerId,
                $customerName,
                $customerPhone,
                $o['customer_email'] ?? null,
                $o['total_amount'] ?? 0,
                (float)($o['amount_paid'] ?? 0),
                (float)($o['balance'] ?? 0),
                $o['status'] ?? 'pending',
                $o['delivery_type'] ?? 'pickup',
                $o['delivery_address'] ?? null,
                $o['notes'] ?? null,
                $o['payment_method'] ?? 'cash',
                $o['payment_status'] ?? 'pending',
                $o['payment_reference'] ?? $o['payment_ref'] ?? null,
                $o['transaction_id'] ?? null,
                $o['estimated_ready_at'] ?? null,
                $o['cash_session_id'] ?? null
            ]);

            // 3. Save items
            if (isset($o['items']) && is_array($o['items'])) {
                $stmtDel = $pdo->prepare("DELETE FROM order_items WHERE order_id = ?");
                $stmtDel->execute([$orderId]);

                $stmtItem = $pdo->prepare("INSERT INTO order_items (id, order_id, product_name, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?, ?)");
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
            echo json_encode(["success" => true, "id" => $orderId, "short_id" => $shortId]);
        } catch (Throwable $e) {
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
        $cleanPhone = preg_replace('/\D/', '', $identifier);
        $phone1 = $cleanPhone;
        $phone2 = $cleanPhone;
        if (strlen($cleanPhone) === 9) {
            $phone2 = '258' . $cleanPhone;
        } else if (strlen($cleanPhone) === 12 && strpos($cleanPhone, '258') === 0) {
            $phone2 = substr($cleanPhone, 3);
        }
        
        $stmt = $pdo->prepare("SELECT * FROM customers WHERE phone = ? OR phone = ? OR contact_no = ? OR contact_no = ? OR email = ? LIMIT 1");
        $stmt->execute([$phone1, $phone2, $phone1, $phone2, $identifier]);
        $customer = $stmt->fetch();
        if ($customer) unset($customer['password']);
        echo json_encode($customer);
        break;

    case 'auth_customer':
        $identifier = $input['identifier'] ?? '';
        $cleanPhone = preg_replace('/\D/', '', $identifier);
        $phone1 = $cleanPhone;
        $phone2 = $cleanPhone;
        if (strlen($cleanPhone) === 9) {
            $phone2 = '258' . $cleanPhone;
        } else if (strlen($cleanPhone) === 12 && strpos($cleanPhone, '258') === 0) {
            $phone2 = substr($cleanPhone, 3);
        }
        
        $stmt = $pdo->prepare("SELECT * FROM customers WHERE phone = ? OR phone = ? OR contact_no = ? OR contact_no = ? OR email = ?");
        $stmt->execute([$phone1, $phone2, $phone1, $phone2, $identifier]);
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
        $id = $t['id'] ?? uniqid('tm_');
        
        // Dynamic column detection
        $stmt = $pdo->query("DESCRIBE team_members");
        $dbColumns = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        // Prepare data
        $data = [
            'id' => $id,
            'name' => $t['name'] ?? null,
            'username' => $t['username'] ?? null,
            'email' => $t['email'] ?? null,
            'phone' => $t['phone'] ?? null,
            'role' => $t['role'] ?? 'staff',
            'avatar_url' => $t['avatar_url'] ?? null,
            'is_active' => isset($t['is_active']) ? ($t['is_active'] ? 1 : 0) : 1
        ];

        // Only handle password if provided
        if (!empty($t['password'])) {
            $password = $t['password'];
            if (strpos($password, '$2y$') !== 0) {
                $password = password_hash($password, PASSWORD_BCRYPT);
            }
            $data['password'] = $password;
        }

        // Filter data
        $finalData = [];
        foreach ($data as $key => $value) {
            if (in_array($key, $dbColumns)) {
                $finalData[$key] = $value;
            }
        }

        $cols = array_keys($finalData);
        $placeholders = array_fill(0, count($cols), "?");
        $updates = [];
        foreach ($cols as $col) {
            if ($col === 'id') continue;
            $updates[] = "`$col` = VALUES(`$col`)";
        }

        $sql = "INSERT INTO team_members (" . implode(', ', $cols) . ") 
                VALUES (" . implode(', ', $placeholders) . ") 
                ON DUPLICATE KEY UPDATE " . implode(', ', $updates);
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute(array_values($finalData));
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

    case 'save_blog_post':
        $post = $input['post'] ?? [];
        $id = $post['id'] ?? null;
        
        $data = [
            'title' => $post['title'] ?? '',
            'slug' => $post['slug'] ?? '',
            'content' => $post['content'] ?? '',
            'excerpt' => $post['excerpt'] ?? '',
            'image_url' => $post['image_url'] ?? '',
            'category' => $post['category'] ?? '',
            'tags' => isset($post['tags']) ? (is_array($post['tags']) ? json_encode($post['tags']) : $post['tags']) : '[]',
            'status' => $post['status'] ?? 'draft',
            'author' => $post['author'] ?? 'Admin',
            'seo_title' => $post['seo_title'] ?? '',
            'seo_description' => $post['seo_description'] ?? ''
        ];

        // Schema management
        try {
            $stmt = $pdo->query("DESCRIBE blog_posts");
            $existingColumns = $stmt->fetchAll(PDO::FETCH_COLUMN);
            foreach ($data as $col => $val) {
                if (!in_array($col, $existingColumns)) {
                    $pdo->exec("ALTER TABLE blog_posts ADD COLUMN `$col` TEXT");
                }
            }
            if (!in_array('created_at', $existingColumns)) $pdo->exec("ALTER TABLE blog_posts ADD COLUMN `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
            if (!in_array('updated_at', $existingColumns)) $pdo->exec("ALTER TABLE blog_posts ADD COLUMN `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
        } catch (Exception $e) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS blog_posts (
                id VARCHAR(50) PRIMARY KEY,
                title VARCHAR(255),
                slug VARCHAR(255) UNIQUE,
                content LONGTEXT,
                excerpt TEXT,
                image_url TEXT,
                category VARCHAR(100),
                tags TEXT,
                status VARCHAR(50),
                author VARCHAR(100),
                seo_title VARCHAR(255),
                seo_description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )");
        }

        if ($id) {
            $data['updated_at'] = date('Y-m-d H:i:s');
            $setParts = [];
            foreach ($data as $key => $val) { $setParts[] = "`$key` = ?"; }
            $stmt = $pdo->prepare("UPDATE blog_posts SET " . implode(', ', $setParts) . " WHERE id = ?");
            $stmt->execute(array_merge(array_values($data), [$id]));
        } else {
            $id = uniqid('post_');
            $data['id'] = $id;
            $data['created_at'] = date('Y-m-d H:i:s');
            $data['updated_at'] = date('Y-m-d H:i:s');
            $cols = array_keys($data);
            $vals = array_fill(0, count($cols), '?');
            $stmt = $pdo->prepare("INSERT INTO blog_posts (`" . implode('`, `', $cols) . "`) VALUES (" . implode(', ', $vals) . ")");
            $stmt->execute(array_values($data));
        }
        echo json_encode(['success' => true, 'id' => $id]);
        break;

    case 'delete_blog_post':
        $id = $input['id'] ?? '';
        $stmt = $pdo->prepare("DELETE FROM blog_posts WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    case 'get_blog_post_by_slug':
        $slug = $input['slug'] ?? '';
        $stmt = $pdo->prepare("SELECT * FROM blog_posts WHERE slug = ?");
        $stmt->execute([$slug]);
        echo json_encode($stmt->fetch());
        break;

    case 'get_blog_comments':
        $postId = $input['post_id'] ?? '';
        if (empty($postId) || $postId === 'undefined' || $postId === 'null') {
            $stmt = $pdo->prepare("SELECT * FROM blog_comments ORDER BY created_at DESC");
            $stmt->execute();
        } else {
            $stmt = $pdo->prepare("SELECT * FROM blog_comments WHERE post_id = ? ORDER BY created_at ASC");
            $stmt->execute([$postId]);
        }
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
        echo json_encode(['success' => true, 'data' => $stmt->fetch()]);
        break;

    case 'update_blog_comment_status':
        $id = $input['id'] ?? '';
        $status = $input['status'] ?? 'pending';
        $stmt = $pdo->prepare("UPDATE blog_comments SET status = ? WHERE id = ?");
        $stmt->execute([$status, $id]);
        echo json_encode(['success' => true]);
        break;

    case 'delete_blog_comment':
        $id = $input['id'] ?? '';
        $stmt = $pdo->prepare("DELETE FROM blog_comments WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    // --- QUEUE / TICKETS ---
    case 'generate_ticket':
        $phone = $input['phone'] ?? null;
        $userId = $input['user_id'] ?? null;
        $priority = $input['is_priority'] ?? false;
        $category = $input['category'] ?? 'Geral';
        
        $identifier = $phone ?? $userId;
        
        // Priority tickets always require an identifier
        if ($priority && !$identifier) {
            echo json_encode(['success' => false, 'error' => 'Identifier required']);
            break;
        }

        // Only check for existing tickets if an identifier was provided
        if ($identifier) {
            $stmt = $pdo->prepare("SELECT * FROM queue_tickets WHERE (customer_phone = ? OR user_id = ?) AND status = 'waiting' LIMIT 1");
            $stmt->execute([$phone, $userId]);
            $existing = $stmt->fetch();
            if ($existing) {
                echo json_encode(['success' => true, 'data' => [map_ticket($existing)]]);
                break;
            }
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
        $newTicket = map_ticket($stmt->fetch());
        broadcast_queue_event('queue-ticket-created', $newTicket);
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
        $id = $input['id'] ?? '';
        if ($id) {
            $stmt = $pdo->prepare("SELECT * FROM queue_tickets WHERE id = ?");
            $stmt->execute([$id]);
        } else {
            $stmt = $pdo->prepare("SELECT * FROM queue_tickets WHERE (user_id = ? OR customer_phone = ?) AND status IN ('waiting', 'calling') AND DATE(created_at) = CURDATE() ORDER BY created_at DESC LIMIT 1");
            $stmt->execute([$identifier, $identifier]);
        }
        echo json_encode(map_ticket($stmt->fetch()));
        break;

    case 'get_tickets_today':
        $stmt = $pdo->prepare("SELECT * FROM queue_tickets WHERE DATE(created_at) = CURDATE() ORDER BY created_at ASC");
        $stmt->execute();
        $tickets = $stmt->fetchAll();
        foreach ($tickets as &$t) {
            $t = map_ticket($t);
        }
        echo json_encode($tickets);
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
        $updatedTicket = map_ticket($stmt->fetch());
        
        $eventName = ($status === 'calling') ? 'queue-ticket-calling' : 'queue-ticket-updated';
        broadcast_queue_event($eventName, $updatedTicket);
        
        echo json_encode($updatedTicket);
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
        $updatedTicket = map_ticket($stmt->fetch());
        broadcast_queue_event('queue-ticket-updated', $updatedTicket);
        echo json_encode($updatedTicket);
        break;

    case 'reset_today_queue':
        $stmt = $pdo->prepare("UPDATE queue_tickets SET status = 'cancelled' WHERE status IN ('waiting', 'calling') AND DATE(created_at) = CURDATE()");
        $stmt->execute();
        broadcast_queue_event('queue-reset', ["status" => "reset"]);
        echo json_encode(["success" => true]);
        break;

    case 'get_next_ticket':
        $counter = $input['counter'];
        // Try priority first
        $stmt = $pdo->prepare("SELECT * FROM queue_tickets WHERE status = 'waiting' AND priority = 1 AND DATE(created_at) = CURDATE() ORDER BY created_at ASC LIMIT 1");
        $stmt->execute();
        $ticket = $stmt->fetch();
        
        // If no priority, try normal
        if (!$ticket) {
            $stmt = $pdo->prepare("SELECT * FROM queue_tickets WHERE status = 'waiting' AND priority = 0 AND DATE(created_at) = CURDATE() ORDER BY created_at ASC LIMIT 1");
            $stmt->execute();
            $ticket = $stmt->fetch();
        }
        
        if ($ticket) {
            $updateStmt = $pdo->prepare("UPDATE queue_tickets SET status = 'calling', counter = ?, called_at = NOW() WHERE id = ?");
            $updateStmt->execute([$counter, $ticket['id']]);
            
            $stmt = $pdo->prepare("SELECT * FROM queue_tickets WHERE id = ?");
            $stmt->execute([$ticket['id']]);
            $ticket = map_ticket($stmt->fetch());
            broadcast_queue_event('queue-ticket-calling', $ticket);
        } else {
            $ticket = null;
        }
        
        echo json_encode($ticket);
        break;

    // --- WORK SESSIONS ---
    case 'get_active_work_shift':
    case 'get_active_work_session':
        $memberId = $input['member_id'] ?? '';
        $stmt = $pdo->prepare("SELECT * FROM work_sessions WHERE member_id = ? AND status = 'active' ORDER BY clock_in DESC LIMIT 1");
        $stmt->execute([$memberId]);
        echo json_encode($stmt->fetch());
        break;

    case 'save_work_shift':
    case 'save_work_session':
        $s = $input['shift'] ?? $input['session'] ?? $input;
        $id = $s['id'] ?? uniqid('ws_');
        
        $memberId = $s['member_id'] ?? null;
        if ($memberId) {
            $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM team_members WHERE id = ?");
            $checkStmt->execute([$memberId]);
            if ($checkStmt->fetchColumn() == 0) {
                // If memberId is invalid/mock, let's check if there is an active member with the name or username
                $memberName = $s['member_name'] ?? '';
                $findStmt = $pdo->prepare("SELECT id FROM team_members WHERE (name = ? OR username = ?) AND is_active = 1 LIMIT 1");
                $findStmt->execute([$memberName, $memberName]);
                $foundId = $findStmt->fetchColumn();
                if ($foundId) {
                    $memberId = $foundId;
                } else {
                    echo json_encode([
                        'success' => false, 
                        'error' => 'A sua sessão de utilizador é inválida ou expirou (Erro 1452). A sua sessão será terminada por segurança.'
                    ]);
                    break;
                }
            }
        } else {
            echo json_encode([
                'success' => false, 
                'error' => 'Erro no check-in: Utilizador não identificado.'
            ]);
            break;
        }

        $stmt = $pdo->query("DESCRIBE work_sessions");
        $dbColumns = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $data = [
            'id' => $id,
            'member_id' => $memberId,
            'member_name' => $s['member_name'] ?? '',
            'role' => $s['role'] ?? 'staff',
            'clock_in' => $s['clock_in'] ?? date('Y-m-d H:i:s'),
            'status' => $s['status'] ?? 'active'
        ];

        $finalData = [];
        foreach ($data as $key => $value) {
            if (in_array($key, $dbColumns)) {
                $finalData[$key] = $value;
            }
        }

        $cols = array_keys($finalData);
        $placeholders = array_fill(0, count($cols), "?");
        $sql = "INSERT INTO work_sessions (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $placeholders) . ")";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(array_values($finalData));
        
        echo json_encode(['success' => true, 'id' => $id]);
        break;

    case 'get_work_shifts':
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

    case 'update_work_shift':
    case 'update_work_session':
        $id = $input['id'] ?? '';
        $status = $input['status'] ?? 'completed';
        $clock_out = $input['clock_out'] ?? $input['end_time'] ?? date('Y-m-d H:i:s');
        $stmt = $pdo->prepare("UPDATE work_sessions SET status = ?, clock_out = ? WHERE id = ?");
        $stmt->execute([$status, $clock_out, $id]);
        echo json_encode(['success' => true]);
        break;

    // --- SYSTEM & AUDIT ---
    case 'system_settings':
    case 'get_system_settings':
        $key = $input['key'] ?? $_GET['key'] ?? null;
        if ($key) {
            $stmt = $pdo->prepare("SELECT `key`, `value` FROM system_settings WHERE `key` = ?");
            $stmt->execute([$key]);
            $s = $stmt->fetch();
            if ($s) {
                $decoded = json_decode($s['value'], true);
                echo json_encode([['key' => $s['key'], 'value' => (json_last_error() === JSON_ERROR_NONE) ? $decoded : $s['value']]]);
            } else {
                echo json_encode([]);
            }
        } else {
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
        }
        break;

    case 'save_setting':
        $k = $input['key'] ?? null;
        $v = $input['value'] ?? null;
        if (!$k) throw new Exception("Setting key required");
        $v_str = (is_array($v) || is_object($v)) ? json_encode($v) : $v;
        $stmt = $pdo->prepare("INSERT INTO system_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?");
        $stmt->execute([$k, $v_str, $v_str]);
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
        $d = $input['member'] ?? $input['data'] ?? $input;
        $id = $input['id'] ?? $d['id'] ?? null;
        if (!$id) throw new Exception("Member ID required");
        
        // Dynamic column detection
        $stmt = $pdo->query("DESCRIBE team_members");
        $dbColumns = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        $set = [];
        $params = [];
        
        foreach ($d as $key => $val) {
            if ($key === 'id') continue;
            if (in_array($key, $dbColumns)) {
                if ($key === 'password') {
                    if (empty($val)) continue; // Don't update password if empty
                    if (strlen($val) < 60) {
                        $val = password_hash($val, PASSWORD_BCRYPT);
                    }
                }
                $set[] = "`$key` = ?";
                $params[] = (is_array($val) || is_object($val)) ? json_encode($val) : $val;
            }
        }
        
        if (empty($set)) {
            echo json_encode(["success" => true, "message" => "No changes"]);
            break;
        }
        
        $params[] = $id;
        $sql = "UPDATE team_members SET " . implode(', ', $set) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode(["success" => true]);
        break;

    case 'get_contact_messages':
        $folder = $input['folder'] ?? null;
        $email = $input['email'] ?? null;
        $phone = $input['phone'] ?? null;
        
        $where = [];
        $params = [];
        
        if ($folder) {
            $where[] = "folder = ?";
            $params[] = $folder;
        }
        
        if ($email || $phone) {
            $subWhere = [];
            if ($email) { $subWhere[] = "email = ?"; $params[] = $email; }
            if ($phone) { $subWhere[] = "phone = ?"; $params[] = $phone; }
            $where[] = "(" . implode(" OR ", $subWhere) . ")";
        }
        
        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";
        $sql = "SELECT * FROM contact_messages $whereClause ORDER BY created_at DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode($stmt->fetchAll());
        break;

    case 'save_contact_message':
        $m = (isset($input['message']) && is_array($input['message'])) ? $input['message'] : $input;
        $id = $m['id'] ?? uniqid('msg_');
        
        // Safely extract fields with fallbacks to avoid PHP TypeErrors
        $name = $m['name'] ?? 'Cliente Registado';
        $phone = $m['phone'] ?? '';
        $email = $m['email'] ?? null;
        $msgContent = is_array($input['message']) ? ($m['message'] ?? '') : ($input['message'] ?? $m['message'] ?? '');
        $folder = $m['folder'] ?? 'inbox';
        $status = $m['status'] ?? 'new';
        
        $sql = "INSERT INTO contact_messages (id, name, phone, email, message, folder, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $id, 
            $name, 
            $phone, 
            $email, 
            $msgContent, 
            $folder, 
            $status
        ]);
        echo json_encode(["success" => true, "id" => $id]);
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
        $id = $r['id'] ?? uniqid('rcpt_');
        
        $stmt = $pdo->query("DESCRIBE receipts");
        $dbColumns = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $data = [
            'id' => $id,
            'receipt_no' => $r['receipt_no'] ?? ('PC-'.date('Ymd').'-'.rand(100,999)),
            'order_id' => $r['order_id'] ?? null,
            'customer_id' => $r['customer_id'] ?? null,
            'customer_name' => $r['customer_name'] ?? null,
            'amount' => $r['amount'] ?? $r['total_amount'] ?? 0,
            'payment_method' => $r['payment_method'] ?? 'cash',
            'cashier_id' => $r['cashier_id'] ?? null,
            'items' => (is_array($r['items'] ?? null) || is_object($r['items'] ?? null)) ? json_encode($r['items']) : ($r['items'] ?? '[]'),
            'tax_amount' => $r['tax_amount'] ?? 0,
            'document_type' => $r['document_type'] ?? 'Receipt',
            'status' => $r['status'] ?? 'paid'
        ];

        $finalData = [];
        foreach ($data as $key => $value) {
            if (in_array($key, $dbColumns)) {
                $finalData[$key] = $value;
            }
        }

        $cols = array_keys($finalData);
        $placeholders = array_fill(0, count($cols), "?");
        $updates = [];
        foreach ($cols as $col) {
            if ($col === 'id') continue;
            $updates[] = "`$col` = VALUES(`$col`)";
        }

        $sql = "INSERT INTO receipts (" . implode(', ', $cols) . ") 
                VALUES (" . implode(', ', $placeholders) . ") 
                ON DUPLICATE KEY UPDATE " . implode(', ', $updates);
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute(array_values($finalData));
        echo json_encode(['success' => true]);
        break;

    case 'get_cash_registers':
    case 'get_cash_sessions':
        try {
            // 1. Fetch all open sessions
            $stmt = $pdo->query("SELECT * FROM cash_sessions WHERE status = 'open' ORDER BY opened_at DESC");
            $openSessions = $stmt->fetchAll();
            
            if (count($openSessions) > 1) {
                // Keep the absolute newest one, close all others
                $newestSessionId = $openSessions[0]['id'];
                for ($i = 1; $i < count($openSessions); $i++) {
                    $oldSessionId = $openSessions[$i]['id'];
                    $stmtClose = $pdo->prepare("UPDATE cash_sessions SET status = 'closed', closed_at = NOW(), notes = 'Auto-fechado por auto-correção' WHERE id = ?");
                    $stmtClose->execute([$oldSessionId]);
                }
            }
            
            // 2. Fetch the active session
            $stmtActive = $pdo->query("SELECT id FROM cash_sessions WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1");
            $activeSession = $stmtActive->fetch();
            if ($activeSession) {
                $activeSessionId = $activeSession['id'];
                // 3. Self-heal: associate any POS orders created today that have NULL cash_session_id
                $todayStart = date('Y-m-d 00:00:00');
                $todayEnd = date('Y-m-d 23:59:59');
                $updateSql = "UPDATE orders 
                              SET cash_session_id = :session_id 
                              WHERE cash_session_id IS NULL 
                                AND created_at BETWEEN :start AND :end
                                AND (
                                    customer_name LIKE '%POS%' 
                                    OR customer_name LIKE '%Local%' 
                                    OR delivery_type IN ('pickup', 'dine_in')
                                    OR delivery_address = 'LOCAL'
                                    OR delivery_address = 'TAKEAWAY'
                                )";
                $stmtUpdate = $pdo->prepare($updateSql);
                $stmtUpdate->execute([
                    'session_id' => $activeSessionId,
                    'start' => $todayStart,
                    'end' => $todayEnd
                ]);
            }
        } catch (Exception $e) {
            // Log error but continue to return the sessions
            debug_log("Error during self-healing: " . $e->getMessage());
        }

        $stmt = $pdo->query("SELECT * FROM cash_sessions ORDER BY opened_at DESC LIMIT 50");
        echo json_encode($stmt->fetchAll());
        break;

    case 'save_cash_register':
    case 'save_cash_session':
        try {
            $openedBy = $input['opened_by'] ?? null;
            $balance = $input['opening_balance'] ?? 0;
            if (!$openedBy) throw new Exception("Admin ID (opened_by) required");
            
            $stmt = $pdo->query("DESCRIBE cash_sessions");
            $dbColumns = $stmt->fetchAll(PDO::FETCH_COLUMN);

            $id = uniqid('cs_');
            $data = [
                'id' => $id,
                'opened_by' => $openedBy,
                'opening_balance' => $balance,
                'status' => 'open',
                'opened_at' => date('Y-m-d H:i:s')
            ];

            $finalData = [];
            foreach ($data as $key => $value) {
                if (in_array($key, $dbColumns)) {
                    $finalData[$key] = $value;
                }
            }

            $cols = array_keys($finalData);
            $placeholders = array_fill(0, count($cols), "?");
            $sql = "INSERT INTO cash_sessions (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $placeholders) . ")";
            $stmt = $pdo->prepare($sql);
            $stmt->execute(array_values($finalData));
            echo json_encode(['success' => true, 'id' => $id]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    case 'update_cash_register':
    case 'update_cash_session':
        $id = $input['id'];
        $stmt = $pdo->query("DESCRIBE cash_sessions");
        $dbColumns = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $updates = [];
        $params = [];
        
        $data = [
            'closing_balance' => $input['closing_balance'],
            'closed_at' => date('Y-m-d H:i:s'),
            'status' => 'closed',
            'notes' => $input['notes'] ?? ''
        ];

        foreach ($data as $key => $val) {
            if (in_array($key, $dbColumns)) {
                $updates[] = "`$key` = ?";
                $params[] = $val;
            }
        }

        if (empty($updates)) {
            echo json_encode(['success' => true]);
            break;
        }

        $params[] = $id;
        $sql = "UPDATE cash_sessions SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
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
            "sender_id" => "PAOCASEIRO",
            "number" => $input['number'],
            "message" => $input['message']
        ];
        
        $ch = curl_init('https://my.turbo.host/api/international-sms/submit');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        
        $response = curl_exec($ch);
        $err = curl_error($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($err) {
            echo json_encode(["success" => false, "error" => "SMS cURL Error: $err"]);
        } else {
            echo json_encode([
                "success" => ($http_code == 200),
                "response" => json_decode($response, true) ?: $response,
                "http_code" => $http_code
            ]);
        }
        break;

    case 'send_whatsapp':
        $wa_instance = $input['instance'] ?? "Pao caseiro";
        $wa_apikey = "429683C4C977415CAAFCCE10F7D57E11";
        $wa_url = "https://wa.zyphtech.com";
        
        $number = $input['number'];
        $text = $input['text'] ?? '';
        $media = $input['media'] ?? null;
        
        // Use rawurlencode for instance name to get %20 instead of +
        $encoded_instance = rawurlencode($wa_instance);
        
        if ($media) {
            $endpoint = "/message/sendMedia/" . $encoded_instance;
            $payload = [
                "number" => $number,
                "mediatype" => $input['mediatype'] ?? 'document',
                "media" => $media,
                "fileName" => $input['fileName'] ?? 'document.pdf',
                "caption" => $input['caption'] ?? ''
            ];
        } else {
            $endpoint = "/message/sendText/" . $encoded_instance;
            $payload = [
                "number" => $number,
                "text" => $text,
                "options" => [
                    "delay" => 1200,
                    "presence" => "composing",
                    "linkPreview" => false
                ]
            ];
        }
        
        $ch = curl_init($wa_url . $endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Content-Type: application/json",
            "apikey: $wa_apikey"
        ]);
        
        $response = curl_exec($ch);
        $err = curl_error($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($err) {
            error_log("[WA] cURL Error sending to $number: $err");
            echo json_encode(["success" => false, "error" => "WA cURL Error: $err"]);
        } else {
            $decoded = json_decode($response, true);
            
            // Log failures for debugging
            if ($http_code >= 400) {
                error_log("[WA] Send Failed ($http_code) to $number: " . $response);
                echo json_encode([
                    "success" => false, 
                    "error" => $decoded['message'] ?? $decoded['error'] ?? "WhatsApp API Error (HTTP $http_code)",
                    "http_code" => $http_code,
                    "wa_response" => $decoded
                ]);
            } else {
                // Check if Evolution API returned an error within a 200 response
                $isDisconnected = isset($decoded['error']) || 
                                  (isset($decoded['status']) && $decoded['status'] === 'ERROR') ||
                                  (isset($decoded['message']) && stripos($decoded['message'], 'not connected') !== false);
                
                if ($isDisconnected) {
                    error_log("[WA] Instance possibly disconnected. Response: " . $response);
                    echo json_encode([
                        "success" => false,
                        "error" => "WhatsApp instance may be disconnected. Check wa.zyphtech.com/manager",
                        "wa_response" => $decoded
                    ]);
                } else {
                    echo json_encode([
                        "success" => true,
                        "data" => $decoded
                    ]);
                }
            }
        }
        break;

    // --- GALLERY ---
    case 'get_gallery':
    case 'fetch_gallery':
        $stmt = $pdo->query("SELECT * FROM gallery ORDER BY created_at DESC");
        $items = $stmt->fetchAll();
        echo json_encode(['success' => true, 'data' => $items]);
        break;

    case 'save_gallery_item':
        $item = $input['item'] ?? [];
        $id = $item['id'] ?? null;
        $data = [
            'title' => $item['title'] ?? '',
            'description' => $item['description'] ?? '',
            'image_url' => $item['image_url'] ?? '',
            'category' => $item['category'] ?? 'General',
            'is_active' => $item['is_active'] ?? true
        ];
        
        if ($id) {
            $fields = [];
            foreach ($data as $k => $v) { $fields[] = "`$k` = ?"; }
            $stmt = $pdo->prepare("UPDATE gallery SET " . implode(', ', $fields) . " WHERE id = ?");
            $stmt->execute(array_merge(array_values($data), [$id]));
        } else {
            $id = uniqid('gal_');
            $data['id'] = $id;
            $cols = array_keys($data);
            $placeholders = array_fill(0, count($cols), '?');
            $stmt = $pdo->prepare("INSERT INTO gallery (`" . implode('`, `', $cols) . "`) VALUES (" . implode(', ', $placeholders) . ")");
            $stmt->execute(array_values($data));
        }
        echo json_encode(['success' => true, 'id' => $id]);
        break;

    case 'delete_gallery_item':
        $id = $input['id'] ?? '';
        $stmt = $pdo->prepare("DELETE FROM gallery WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    case 'get_email_campaigns':
        $stmt = $pdo->query("SELECT * FROM email_campaigns ORDER BY created_at DESC");
        echo json_encode($stmt->fetchAll());
        break;

    case 'save_email_campaign':
        $c = $input['campaign'] ?? $input;
        $id = $c['id'] ?? null;
        
        $sent_at = null;
        if (!empty($c['sent_at'])) {
            $sent_at = date('Y-m-d H:i:s', strtotime($c['sent_at']));
        }

        $data = [
            'subject' => $c['subject'] ?? '',
            'title' => $c['title'] ?? '',
            'content' => $c['content'] ?? '',
            'status' => $c['status'] ?? 'draft',
            'target_count' => isset($c['target_count']) ? (int)$c['target_count'] : 0,
            'sent_at' => $sent_at
        ];

        if ($id) {
            $setParts = [];
            foreach ($data as $key => $val) { 
                $setParts[] = "`$key` = ?"; 
            }
            $stmt = $pdo->prepare("UPDATE email_campaigns SET " . implode(', ', $setParts) . " WHERE id = ?");
            $stmt->execute(array_merge(array_values($data), [$id]));
        } else {
            $id = uniqid('camp_');
            $data['id'] = $id;
            $data['created_at'] = date('Y-m-d H:i:s');
            $cols = array_keys($data);
            $vals = array_fill(0, count($cols), '?');
            $stmt = $pdo->prepare("INSERT INTO email_campaigns (`" . implode('`, `', $cols) . "`) VALUES (" . implode(', ', $vals) . ")");
            $stmt->execute(array_values($data));
        }

        $stmt = $pdo->prepare("SELECT * FROM email_campaigns WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    case 'delete_email_campaign':
        $id = $input['id'] ?? '';
        $stmt = $pdo->prepare("DELETE FROM email_campaigns WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    case 'test_email':
        $to = $input['to'] ?? 'geral@paocaseiro.co.mz';
        $subject = $input['subject'] ?? 'Teste de Email Pão Caseiro';
        $html = $input['html'] ?? '<h1>Funcionando!</h1><p>Este é um teste de entrega da ponte PHP.</p>';
        $result = send_resend_email($to, $subject, $html);
        $is_success = ($result !== false && !isset($result['error']) && !isset($result['message']));
        echo json_encode(['success' => $is_success, 'result' => $result]);
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
        $folderId = $input['folder_id'] ?? $_GET['folder_id'] ?? null;
        $sql = $folderId ? "SELECT * FROM drive_files WHERE folder_id = ? ORDER BY created_at DESC" : "SELECT * FROM drive_files WHERE folder_id IS NULL ORDER BY created_at DESC";
        $stmt = $pdo->prepare($sql);
        if ($folderId) $stmt->execute([$folderId]);
        else $stmt->execute();
        $filesList = $stmt->fetchAll();
        
        // Rewrite path to use the serve_file action for client consumption
        foreach ($filesList as &$fileItem) {
            $fileItem['path'] = "paocaseiro_db.php?action=serve_file&id=" . $fileItem['id'];
        }
        echo json_encode(["success" => true, "data" => $filesList]);
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
        
        // Fetch path to delete the physical file
        $stmtFile = $pdo->prepare("SELECT path FROM drive_files WHERE id = ?");
        $stmtFile->execute([$id]);
        $filePath = $stmtFile->fetchColumn();
        
        if ($filePath) {
            $parts = explode('/', $filePath);
            $folder = (count($parts) >= 2) ? $parts[count($parts)-2] : 'drive';
            $fileName = basename($filePath);
            
            $absoluteDir = get_persistent_upload_dir($folder);
            $resolvedPath = $absoluteDir . $fileName;
            
            if (file_exists($resolvedPath)) {
                @unlink($resolvedPath);
            } else {
                // Try fallback to relative path
                $fallbackPath = __DIR__ . '/' . $filePath;
                if (file_exists($fallbackPath)) {
                    @unlink($fallbackPath);
                }
            }
        }
        
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
        $targetFolder = preg_replace('/[^a-zA-Z0-9_\-]/', '', $_POST['target_folder'] ?? 'drive');
        if (empty($targetFolder)) $targetFolder = 'drive';
        
        $uploadDir = get_persistent_upload_dir($targetFolder);
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        $fileName = time() . '_' . basename($file['name']);
        $targetPath = $uploadDir . $fileName;
        
        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            $id = uniqid();
            $dbPath = 'uploads/' . $targetFolder . '/' . $fileName;
            
            $stmt = $pdo->prepare("INSERT INTO drive_files (id, name, path, size, type, folder_id, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $id,
                $file['name'],
                $dbPath,
                $file['size'],
                $file['type'],
                $folderId,
                $uploadedBy
            ]);
            
            $proxyPath = "paocaseiro_db.php?action=serve_file&id=" . $id;
            echo json_encode(["success" => true, "id" => $id, "path" => $proxyPath]);
        } else {
            echo json_encode(["error" => "Failed to move uploaded file"]);
        }
        break;

    case 'list_uploads':
        $dir = 'uploads/blog/';
        if (is_dir($dir)) {
            $files = scandir($dir);
            $result = [];
            foreach ($files as $file) {
                if ($file !== '.' && $file !== '..') {
                    $result[] = [
                        "name" => $file,
                        "size" => filesize($dir . $file),
                        "perms" => substr(sprintf('%o', fileperms($dir . $file)), -4),
                        "readable" => is_readable($dir . $file)
                    ];
                }
            }
            echo json_encode(["success" => true, "files" => $result, "dir_perms" => substr(sprintf('%o', fileperms($dir)), -4)]);
        } else {
            echo json_encode(["success" => false, "error" => "Directory does not exist", "cwd" => getcwd()]);
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

    case 'init_tx':
        try {
            $inputPayload = $input['payload'] ?? $input;
            $txAction = $inputPayload['action'] ?? 'initiate';
            
            // Clean payload for PaySuite
            $paySuitePayload = $inputPayload;
            unset($paySuitePayload['action']); // Remove our internal action field
            
            // Bulletproof: Sanitize reference and description to strictly alphanumeric characters for PaySuite
            if ($txAction === 'initiate') {
                if (isset($paySuitePayload['reference'])) {
                    $originalRef = $paySuitePayload['reference'];
                    // Strip anything that is NOT a letter or a digit
                    $cleanRef = preg_replace('/[^a-zA-Z0-9]/', '', $originalRef);
                    $paySuitePayload['reference'] = $cleanRef;
                    
                    // Also sanitize the description to contain only alphanumeric characters and spaces
                    if (isset($paySuitePayload['description'])) {
                        $paySuitePayload['description'] = preg_replace('/[^a-zA-Z0-9\s]/', '', $paySuitePayload['description']);
                    } else {
                        $paySuitePayload['description'] = "Pagamento " . $cleanRef;
                    }
                    debug_log("PaySuite Reference Sanitized from '$originalRef' to '$cleanRef'");
                }
            }
            
            $url = "https://paysuite.tech/api/v1/payments";
            if ($txAction === 'verify') {
                $id = $inputPayload['id'] ?? $inputPayload['reference'] ?? '';
                $url .= "/" . $id;
            }

            debug_log("Initiating PaySuite " . $txAction . " at " . $url);
            if ($txAction === 'initiate') {
                debug_log("Payload: " . json_encode($paySuitePayload));
            }

            $ch = curl_init();
            $curlOptions = [
                CURLOPT_URL => $url,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_ENCODING => "",
                CURLOPT_MAXREDIRS => 5,
                CURLOPT_TIMEOUT => 25,
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => 0,
                CURLOPT_HTTPHEADER => [
                    "Accept: application/json",
                    "Content-Type: application/json",
                    "Authorization: Bearer " . $PAYSUITE_TOKEN
                ],
            ];

            if ($txAction === 'initiate') {
                $curlOptions[CURLOPT_POST] = true;
                $curlOptions[CURLOPT_POSTFIELDS] = json_encode($paySuitePayload);
            } else {
                $curlOptions[CURLOPT_CUSTOMREQUEST] = "GET";
            }

            curl_setopt_array($ch, $curlOptions);
            
            $response = curl_exec($ch);
            $err = curl_error($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($err) {
                debug_log("PaySuite CURL Error: " . $err);
                echo json_encode([
                    "success" => false,
                    "message" => "Erro de conexão (cURL): " . $err
                ]);
            } else {
                debug_log("PaySuite RAW Response (HTTP $httpCode): " . $response);
                $decoded = json_decode($response, true);
                
                if ($httpCode == 401) {
                    debug_log("PaySuite AUTH FAILURE. Current Token: " . substr($PAYSUITE_TOKEN, 0, 8) . "...");
                }

                $isSuccess = ($httpCode >= 200 && $httpCode < 300);
                
                // PaySuite returns 201 Created and nests data inside a 'data' object
                $reallySuccessful = $isSuccess && $decoded && (
                    isset($decoded['checkout_url']) || 
                    isset($decoded['data']['checkout_url']) || 
                    (isset($decoded['success']) && $decoded['success'] === true) ||
                    (isset($decoded['status']) && $decoded['status'] === 'success')
                );

                if ($reallySuccessful) {
                    // Extract the inner data if it exists, otherwise return decoded
                    $responseData = $decoded['data'] ?? $decoded;
                    echo json_encode(["success" => true, "data" => $responseData]); 
                } else {
                    debug_log("PaySuite Logic Error (HTTP $httpCode): " . $response);
                    http_response_code($httpCode);
                    echo json_encode([
                        "success" => false,
                        "message" => "A PaySuite retornou um erro (HTTP $httpCode)",
                        "error_details" => $decoded ? $decoded : $response,
                        "payload_sent" => $txAction === 'initiate' ? $paySuitePayload : null
                    ]);
                }
            }
        } catch (Exception $e) {
            debug_log("Exception in init_tx: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Excepção interna: " . $e->getMessage()]);
        }
        break;

    case 'webhook':
        // Webhook security verification per PaySuite docs
        $payload = file_get_contents('php://input');
        $signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';

        debug_log("PaySuite Webhook Received. Signature: " . $signature);

        $calculatedSignature = hash_hmac('sha256', $payload, $PAYSUITE_WEBHOOK_SECRET);

        if (hash_equals($signature, $calculatedSignature)) {
            $data = json_decode($payload, true);
            $event = $data['event'] ?? '';
            $ref = $data['data']['reference'] ?? '';
            $txId = $data['data']['transaction']['id'] ?? null;

            debug_log("Webhook Verified: $event for Ref: $ref");

            if ($event === 'payment.success') {
                // FIX: Update payment_status='paid' but KEEP status='pending' so order appears in KDS panel
                $stmtUpd = $pdo->prepare("UPDATE orders SET payment_status = 'paid', transaction_id = ?, updated_at = NOW() WHERE payment_reference = ?");
                $stmtUpd->execute([$txId, $ref]);
                debug_log("Order $ref payment_status marked as PAID via Webhook. Status remains 'pending' for KDS.");

                // Fetch order details for notifications
                $stmtFetch = $pdo->prepare("SELECT * FROM orders WHERE payment_reference = ? LIMIT 1");
                $stmtFetch->execute([$ref]);
                $paidOrder = $stmtFetch->fetch();

                if ($paidOrder) {
                    $clientName  = $paidOrder['customer_name'] ?? 'Cliente';
                    $clientPhone = $paidOrder['customer_phone'] ?? '';
                    $shortId     = $paidOrder['short_id'] ?? $ref;
                    $totalAmt    = number_format((float)($paidOrder['total_amount'] ?? 0), 2, '.', ',');
                    $receiptUrl  = "https://paocaseiro.co.mz/order-receipt/" . $shortId;

                    // --- Notify CLIENT ---
                    if ($clientPhone) {
                        $clientMsg = "Ola {$clientName}! O seu pagamento de {$totalAmt} MT foi confirmado. Pedido #{$shortId} em preparacao. Recibo: {$receiptUrl}";
                        // WhatsApp
                        $waResult = send_whatsapp_internal($clientPhone, $clientMsg);
                        debug_log("Client WA notification result: " . json_encode($waResult));
                        // SMS fallback
                        $smsMsg = "PaoCaseiro: Pagamento {$totalAmt} MT confirmado! Pedido #{$shortId}. Recibo: {$receiptUrl}";
                        send_sms_internal($clientPhone, $smsMsg);
                    }

                    // --- Notify ADMIN TEAM via WhatsApp ---
                    $adminNumbers = ['258879146662', '258846930960', '258876666903'];
                    $adminMsg = "NOVO PEDIDO PAGO! #{$shortId} | Cliente: {$clientName} ({$clientPhone}) | Total: {$totalAmt} MT | Ref: {$ref} | Ver painel: https://paocaseiro.co.mz/admin";
                    foreach ($adminNumbers as $adminNum) {
                        send_whatsapp_internal($adminNum, $adminMsg);
                    }
                    debug_log("Admin team notified for order $shortId");

                    // --- Insert Notification in DB ---
                    try {
                        $notifId = uniqid('notif_');
                        $stmtNotif = $pdo->prepare("INSERT INTO notifications (id, type, title, message, entity_id, link, `read`) VALUES (?, 'order', ?, ?, ?, ?, 0)");
                        $stmtNotif->execute([
                            $notifId,
                            "Pagamento Confirmado: #{$shortId}",
                            "Pedido #{$shortId} de {$clientName} foi pago ({$totalAmt} MT). Pronto para preparação.",
                            $paidOrder['id'],
                            "/admin?tab=orders&order=" . $shortId
                        ]);
                    } catch (Exception $notifEx) {
                        debug_log("Failed to insert notification: " . $notifEx->getMessage());
                    }
                }

            } else if ($event === 'payment.failed') {
                $error = $data['data']['error'] ?? 'Unknown error';
                $stmtFail = $pdo->prepare("UPDATE orders SET payment_status = 'failed', notes = CONCAT(IFNULL(notes,''), '\nPaySuite Error: ', ?), updated_at = NOW() WHERE payment_reference = ?");
                $stmtFail->execute([$error, $ref]);
                debug_log("Order $ref marked as FAILED via Webhook: $error");
            }

            echo json_encode(["status" => "success", "message" => "Event processed"]);
        } else {
            debug_log("Webhook Signature Mismatch! Calculated: $calculatedSignature");
            http_response_code(401);
            echo json_encode(["status" => "error", "message" => "Invalid signature"]);
        }
        break;

    // Legacy paysuite_webhook removed - use verified 'webhook' action above.


    case 'get_ai_insights':
        try {
            $prompt = $input['prompt'] ?? '';
            $systemContext = $input['systemContext'] ?? 'Você é a Zyph AI.';
            
            // Fetch OpenRouter API key and model dynamically from settings table
            $stmt = $pdo->prepare("SELECT value FROM settings WHERE `key` = ?");
            $stmt->execute(['openrouter_api_key']);
            $setting = $stmt->fetch();
            $openRouterKey = $setting ? $setting['value'] : '';

            $stmt->execute(['ai_model']);
            $modelSetting = $stmt->fetch();
            $aiModel = ($modelSetting && !empty($modelSetting['value'])) ? $modelSetting['value'] : 'google/gemini-2.0-flash-001';

            if (empty($openRouterKey)) {
                $openRouterKey = getenv('OPENROUTER_API_KEY') ?: '';
            }
            
            $ch = curl_init("https://openrouter.ai/api/v1/chat/completions");
            $data = [
                "model" => $aiModel,
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

            // Fetch OpenRouter API key and model dynamically from settings table
            $stmt = $pdo->prepare("SELECT value FROM settings WHERE `key` = ?");
            $stmt->execute(['openrouter_api_key']);
            $setting = $stmt->fetch();
            $openRouterKey = $setting ? $setting['value'] : '';

            $stmt->execute(['ai_model']);
            $modelSetting = $stmt->fetch();
            $aiModel = ($modelSetting && !empty($modelSetting['value'])) ? $modelSetting['value'] : 'google/gemini-2.0-flash-001';

            if (empty($openRouterKey)) {
                $openRouterKey = getenv('OPENROUTER_API_KEY') ?: '';
            }
            
            $ch = curl_init("https://openrouter.ai/api/v1/chat/completions");
            $prompt = "Você é um especialista em segurança e auditoria da padaria Pão Caseiro. 
                       Analise os seguintes logs de auditoria e forneça um relatório conciso com:
                       1. Nível de risco atual.
                       2. Principais anomalias ou falhas de segurança/operação.
                       3. Recomendações imediatas.
                       
                       Logs:\n" . $logSummary;

            $data = [
                "model" => $aiModel,
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
            $tables = ['products', 'customers', 'orders', 'order_items', 'receipts', 'team_members', 'audit_logs', 'newsletter_subscribers', 'drive_files'];
            $exportData = [];
            foreach ($tables as $table) {
                // Check if table exists before querying
                $check = $pdo->query("SHOW TABLES LIKE '$table'");
                if ($check->rowCount() > 0) {
                    $stmt = $pdo->query("SELECT * FROM $table");
                    $exportData[$table] = $stmt->fetchAll(PDO::FETCH_ASSOC);
                }
            }
            echo json_encode(['success' => true, 'data' => $exportData]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'subscribe_newsletter':
        try {
            $email = $input['email'] ?? $_POST['email'] ?? null;
            $name = $input['name'] ?? $_POST['name'] ?? 'Subscritor';
            if (!$email) throw new Exception("Email é obrigatório");

            // Ensure table exists
            $pdo->exec("CREATE TABLE IF NOT EXISTS newsletter_subscribers (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255),
                email VARCHAR(255) UNIQUE,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )");

            // Check if exists
            $stmt = $pdo->prepare("SELECT id, status FROM newsletter_subscribers WHERE email = ?");
            $stmt->execute([$email]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                // Already exists, just update name and status if needed
                $stmt = $pdo->prepare("UPDATE newsletter_subscribers SET name = ?, status = 'active' WHERE id = ?");
                $stmt->execute([$name, $existing['id']]);
                echo json_encode([
                    "success" => true, 
                    "message" => "Obrigado! Já reconhecemos o seu registo.", 
                    "id" => $existing['id'],
                    "is_returning" => true
                ]);
            } else {
                $id = uniqid();
                $stmt = $pdo->prepare("INSERT INTO newsletter_subscribers (id, name, email, status) VALUES (?, ?, ?, 'active')");
                $stmt->execute([$id, $name, $email]);
                echo json_encode(["success" => true, "id" => $id, "is_returning" => false]);
            }
        } catch (Exception $e) {
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'get_newsletter_subscribers':
        try {
            $stmt = $pdo->query("SELECT * FROM newsletter_subscribers ORDER BY created_at DESC");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (Exception $e) {
            echo json_encode([]);
        }
        break;

    case 'delete_newsletter_subscriber':
        try {
            $id = $input['id'] ?? $_GET['id'] ?? null;
            if (!$id) throw new Exception("ID é obrigatório");
            $stmt = $pdo->prepare("DELETE FROM newsletter_subscribers WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(["success" => true]);
        } catch (Exception $e) {
            echo json_encode(["success" => false, "error" => $e->getMessage()]);
        }
        break;

    case 'get_schema':
        $table = $input['table'] ?? $_GET['table'] ?? null;
        if (!$table) throw new Exception("Table name required");
        $stmt = $pdo->query("DESCRIBE `$table`");
        echo json_encode($stmt->fetchAll());
        break;

    case 'test':
        echo json_encode(['success' => true, 'message' => 'Bridge OK', 'time' => date('Y-m-d H:i:s')]);
        break;

    default:
        http_response_code(404);
        echo json_encode(["error" => "Ação não encontrada: " . $action]);
        break;
    } // End Switch
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false, 
        "error" => $e->getMessage(),
        "action" => $action
    ]);
}

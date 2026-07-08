import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Support parsing JSON bodies
app.use(express.json());

// Security and Optimization Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Disabling CPS temporarily to avoid breaking inline scripts/images of the PWA unless explicitly configured.
}));
app.use(cors());
app.use(compression());

// POST endpoint for PHP backend (or other internal services) to trigger queue updates
app.post('/api/queue-event', (req, res) => {
    const { event, data } = req.body;
    if (!event) {
        return res.status(400).json({ error: 'Event name is required' });
    }

    console.log(`[Queue Event] Broadcasting event: ${event}`);
    
    // Broadcast event to all connected WebSocket clients
    let broadcastCount = 0;
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ event, data }));
            broadcastCount++;
        }
    });

    return res.json({ success: true, clientsNotified: broadcastCount });
});

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing: redirect all requests to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[Server Error]', err.stack);
    res.status(500).send('Something broke!');
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server attached to the HTTP server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('[WebSocket] Client connected');
    
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', (message) => {
        try {
            const payload = JSON.parse(message);
            console.log('[WebSocket] Received message:', payload);
            
            // Allow clients to trigger simple ping
            if (payload.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
            }
        } catch (e) {
            console.error('[WebSocket] Invalid JSON message:', message);
        }
    });

    ws.on('close', () => {
        console.log('[WebSocket] Client disconnected');
    });

    ws.on('error', (err) => {
        console.error('[WebSocket] Connection error:', err);
    });
});

// Heartbeat ping interval to clean up stale connections
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            console.log('[WebSocket] Terminating stale connection');
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => {
    clearInterval(interval);
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Serving static files from: ${path.join(__dirname, 'dist')}`);
    console.log(`WebSocket server endpoint: ws://localhost:${PORT}/ws`);
});


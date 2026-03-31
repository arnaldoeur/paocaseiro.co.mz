import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Security and Optimization Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Disabling CPS temporarily to avoid breaking inline scripts/images of the PWA unless explicitly configured.
}));
app.use(cors());
app.use(compression());

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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Serving files from: ${path.join(__dirname, 'dist')}`);
});

import express from 'express';
import cors from 'cors';
import { config } from './config/config.js';
import router from './routes/index.js';

const app = express();

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`, {
        query: req.query,
        headers: {
            authorization: req.headers.authorization ? '***' : undefined,
            'music-user-token': req.headers['music-user-token'] ? '***' : undefined,
        }
    });
    next();
});

// CORS middleware - iOS cihazından gelen istekler için gerekli
app.use(cors({
    origin: true, // Tüm origin'lere izin ver (development için)
    credentials: true
}));

app.use(express.json());

app.use('/api',router);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[SERVER] Unhandled error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = Number(config.server.port);
const HOST = config.server.host;

app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
    console.log(`Local access: http://localhost:${PORT}`);
    // Local IP adresini bulmak için network interface'leri kontrol edilebilir
    // iOS cihazınızdan erişmek için: http://[YOUR_LOCAL_IP]:${PORT}/api`);
});


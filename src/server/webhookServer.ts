import express, { Express, Request, Response } from 'express';
import http from 'http';
import { BotClient } from '../types/BotClient.js';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

export class WebhookServer {
    private app: Express;
    private server: http.Server | null = null;
    private client: BotClient;
    private port: number;
    private rateLimits: Map<string, RateLimitEntry>;

    constructor(client: BotClient, port: number = 3000) {
        this.app = express();
        this.client = client;
        this.port = port;
        this.rateLimits = new Map();

        this.setupMiddleware();
        this.setupRoutes();
        this.startRateLimitCleanup();
    }

    private setupMiddleware(): void {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            next();
        });

        this.app.use((req, res, next) => {
            const ip = req.ip || req.socket.remoteAddress || 'unknown';
            logger.debug('WebhookServer', `${req.method} ${req.path} from ${ip}`);
            next();
        });

        this.app.use((req, res, next) => {
            if (!this.checkRateLimit(req)) {
                logger.warn('WebhookServer', `Rate limit exceeded for ${req.ip}`);
                res.status(429).json({ error: 'Rate limit exceeded' });
                return;
            }
            next();
        });
    }

    private setupRoutes(): void {
        this.app.get('/health', (req: Request, res: Response) => {
            res.status(200).json({
                status: 'ok',
                uptime: process.uptime(),
                timestamp: Date.now()
            });
        });

        this.app.post('/webhooks/kofi', async (req: Request, res: Response) => {
            try {
                await this.handleKofiWebhook(req, res);
            } catch (error) {
                logger.error('WebhookServer', 'Error en webhook Ko-fi', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        this.app.post('/webhooks/topgg', async (req: Request, res: Response) => {
            try {
                await this.handleTopggWebhook(req, res);
            } catch (error) {
                logger.error('WebhookServer', 'Error en webhook Top.gg', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        this.app.post('/webhooks/dbl', async (req: Request, res: Response) => {
            try {
                await this.handleDblWebhook(req, res);
            } catch (error) {
                logger.error('WebhookServer', 'Error en webhook DBL', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        this.app.options('/webhooks/kofi', (req: Request, res: Response) => {
            res.status(200).end();
        });

        this.app.options('/webhooks/topgg', (req: Request, res: Response) => {
            res.status(200).end();
        });

        this.app.options('/webhooks/dbl', (req: Request, res: Response) => {
            res.status(200).end();
        });

        this.app.use((req: Request, res: Response) => {
            res.status(404).json({ error: 'Not found' });
        });
    }

    private async handleKofiWebhook(req: Request, res: Response): Promise<void> {
        if (!this.client.donationManager) {
            logger.warn('WebhookServer', 'DonationManager no disponible');
            res.status(503).json({ error: 'Service not available' });
            return;
        }

        let payload;
        try {
            // Ko-fi envía el payload como string JSON dentro del campo 'data'
            payload = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
        } catch (error) {
            logger.error('WebhookServer', 'Error parseando payload de Ko-fi', error);
            res.status(400).json({ error: 'Invalid payload' });
            return;
        }

        const verificationToken = config.premium.kofiVerificationToken;
        const providedToken = payload.verification_token;

        if (!verificationToken || providedToken !== verificationToken) {
            logger.warn('WebhookServer', `Token de verificación Ko-fi inválido. Esperado: "${verificationToken}", Recibido: "${providedToken}"`);
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        logger.info('WebhookServer', 'Webhook Ko-fi recibido');

        const success = await this.client.donationManager.processKofiWebhook(payload);

        if (success) {
            res.status(200).json({ success: true });
        } else {
            res.status(400).json({ error: 'Failed to process donation' });
        }
    }

    private async handleTopggWebhook(req: Request, res: Response): Promise<void> {
        if (!this.client.voteManager) {
            logger.warn('WebhookServer', 'VoteManager no disponible');
            res.status(503).json({ error: 'Service not available' });
            return;
        }

        const webhookSecret = config.premium.topggWebhookSecret;
        const authorization = req.headers.authorization;

        if (!webhookSecret || authorization !== webhookSecret) {
            logger.warn('WebhookServer', 'Token de autorización Top.gg inválido');
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        logger.info('WebhookServer', 'Webhook Top.gg recibido');

        const success = await this.client.voteManager.processTopggVote(req.body);

        if (success) {
            res.status(200).json({ success: true });
        } else {
            res.status(400).json({ error: 'Failed to process vote' });
        }
    }

    private async handleDblWebhook(req: Request, res: Response): Promise<void> {
        if (!this.client.voteManager) {
            logger.warn('WebhookServer', 'VoteManager no disponible');
            res.status(503).json({ error: 'Service not available' });
            return;
        }

        const webhookSecret = config.premium.dblWebhookSecret;
        const authorization = req.headers.authorization;

        if (!webhookSecret || authorization !== webhookSecret) {
            logger.warn('WebhookServer', 'Token de autorización DBL inválido');
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        logger.info('WebhookServer', 'Webhook DBL recibido');

        const success = await this.client.voteManager.processDBLVote(req.body);

        if (success) {
            res.status(200).json({ success: true });
        } else {
            res.status(400).json({ error: 'Failed to process vote' });
        }
    }

    private checkRateLimit(req: Request): boolean {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const oneMinute = 60000;

        const entry = this.rateLimits.get(ip);

        if (!entry || now >= entry.resetAt) {
            this.rateLimits.set(ip, {
                count: 1,
                resetAt: now + oneMinute
            });
            return true;
        }

        if (entry.count >= 10) {
            return false;
        }

        entry.count++;
        return true;
    }

    private startRateLimitCleanup(): void {
        setInterval(() => {
            const now = Date.now();
            for (const [ip, entry] of this.rateLimits.entries()) {
                if (now >= entry.resetAt) {
                    this.rateLimits.delete(ip);
                }
            }
        }, 60000);
    }

    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.port, () => {
                    logger.info('WebhookServer', `Servidor webhook iniciado en puerto ${this.port}`);
                    resolve();
                });

                this.server.on('error', (error) => {
                    logger.error('WebhookServer', 'Error en servidor webhook', error);
                    reject(error);
                });
            } catch (error) {
                logger.error('WebhookServer', 'Error iniciando servidor webhook', error);
                reject(error);
            }
        });
    }

    async stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    logger.info('WebhookServer', 'Servidor webhook detenido');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    getPort(): number {
        return this.port;
    }
}

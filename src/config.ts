import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
    // Discord
    token: z.string().min(1, 'TOKEN es requerido'),
    clientId: z.string().min(1, 'APPLICATION_ID es requerido'),
    guildID: z.string().optional(),
    prefix: z.string().default('*'),
    ownerId: z.string().optional(),

    // Tenor
    tenorApiKey: z.string().min(1, 'TENOR_API_KEY es requerido'),

    // Danbooru
    danbooruApiKey: z.string().min(1, 'DANBOORU_API_KEY es requerido'),
    danbooruUsername: z.string().optional(),

    // Firebase Admin SDK
    firebaseAdminSdk: z.string().min(1, 'FIREBASE_ADMIN_SDK es requerido'),

    // Environment
    environment: z.enum(['development', 'production']).default('development'),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

function loadConfig() {
    try {
        const rawConfig = {
            // Discord
            token: process.env.TOKEN,
            clientId: process.env.APPLICATION_ID,
            prefix: process.env.PREFIX || '*',

            // Tenor
            tenorApiKey: process.env.TENOR_API_KEY,

            //Danbooru
            danbooruApiKey: process.env.DANBOORU_API_KEY,
            danbooruUsername: process.env.DANBOORU_USERNAME,

            // Firebase Admin SDK
            firebaseAdminSdk: process.env.FIREBASE_ADMIN_SDK,

            // Environment
            environment: process.env.NODE_ENV,
            logLevel: process.env.LOG_LEVEL
        };

        return configSchema.parse(rawConfig);
    } catch (error) {
        console.error('❌ Error en la configuración del bot:\n');

        if (error instanceof z.ZodError) {
            error.issues.forEach(issue => {
                const field = issue.path.join('.');
                console.error(`  • ${field}: ${issue.message}`);
            });

            console.error('\n💡 Verifica tu archivo .env y asegúrate de tener todas las variables requeridas.\n');
        } else {
            console.error(error);
        }
        process.exit(1);
    }
}

export const config = loadConfig();

export type Config = z.infer<typeof configSchema>;

/**
 * Configuración de Firebase Admin SDK parseada
 */
export const firebaseAdminConfig = JSON.parse(config.firebaseAdminSdk);
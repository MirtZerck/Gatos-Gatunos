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

    // Firebase
    firebaseApiKey: z.string().min(1, 'FIREBASE_API_KEY es requerido'),
    firebaseAuthDomain: z.string().min(1, 'FIREBASE_AUTH_DOMAIN es requerido'),
    firebaseDatabaseURL: z.string().min(1, 'FIREBASE_DATABASE_URL es requerido'),
    firebaseProjectId: z.string().min(1, 'FIREBASE_PROJECT_ID es requerido'),
    firebaseStorageBucket: z.string().min(1, 'FIREBASE_STORAGE_BUCKET es requerido'),
    firebaseMessagingSenderId: z.string().min(1, 'FIREBASE_MESSAGING_SENDER_ID es requerido'),
    firebaseAppId: z.string().min(1, 'FIREBASE_APP_ID es requerido'),

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

            // Firebase
            firebaseApiKey: process.env.FIREBASE_API_KEY,
            firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
            firebaseDatabaseURL: process.env.FIREBASE_DATABASE_URL,
            firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
            firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
            firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
            firebaseAppId: process.env.FIREBASE_APP_ID,

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
 * Configuración de Firebase extraída para FirebaseManager
 */
export const firebaseConfig = {
    apiKey: config.firebaseApiKey,
    authDomain: config.firebaseAuthDomain,
    databaseURL: config.firebaseDatabaseURL,
    projectId: config.firebaseProjectId,
    storageBucket: config.firebaseStorageBucket,
    messagingSenderId: config.firebaseMessagingSenderId,
    appId: config.firebaseAppId
};
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Schema de validación para la configuración del bot.
 * Utiliza Zod para garantizar que todas las variables requeridas estén presentes.
 */
const configSchema = z.object({
    token: z.string().min(1, 'TOKEN es requerido'),
    clientId: z.string().min(1, 'APPLICATION_ID es requerido'),
    guildID: z.string().optional(),
    prefix: z.string().default('*'),
    ownerId: z.string().optional(),

    tenorApiKey: z.string().min(1, 'TENOR_API_KEY es requerido'),

    danbooruApiKey: z.string().min(1, 'DANBOORU_API_KEY es requerido'),
    danbooruUsername: z.string().optional(),

    firebaseAdminSdk: z.string().min(1, 'FIREBASE_ADMIN_SDK es requerido'),

    environment: z.enum(['development', 'production']).default('development'),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info')
});

/**
 * Carga y valida la configuración desde variables de entorno.
 *
 * @returns {Config} Configuración validada
 * @throws {Error} Si faltan variables requeridas o son inválidas
 */
function loadConfig() {
    try {
        const rawConfig = {
            token: process.env.TOKEN,
            clientId: process.env.APPLICATION_ID,
            prefix: process.env.PREFIX || '*',

            tenorApiKey: process.env.TENOR_API_KEY,

            danbooruApiKey: process.env.DANBOORU_API_KEY,
            danbooruUsername: process.env.DANBOORU_USERNAME,

            firebaseAdminSdk: process.env.FIREBASE_ADMIN_SDK,

            environment: process.env.NODE_ENV,
            logLevel: process.env.LOG_LEVEL
        };

        return configSchema.parse(rawConfig);
    } catch (error) {
        console.error('Error en la configuración del bot:\n');

        if (error instanceof z.ZodError) {
            error.issues.forEach(issue => {
                const field = issue.path.join('.');
                console.error(`  - ${field}: ${issue.message}`);
            });

            console.error('\nVerifica tu archivo .env y asegúrate de tener todas las variables requeridas.\n');
        } else {
            console.error(error);
        }

        process.exit(1);
    }
}

/** Configuración validada del bot */
export const config = loadConfig();

/** Tipo inferido de la configuración */
export type Config = z.infer<typeof configSchema>;

/** Configuración de Firebase Admin SDK parseada desde JSON */
export const firebaseAdminConfig = JSON.parse(config.firebaseAdminSdk);

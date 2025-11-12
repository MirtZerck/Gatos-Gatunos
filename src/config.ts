import dotenv from 'dotenv';

dotenv.config();

export const config = {
    token: process.env.TOKEN!,
    clientId: process.env.APPLICATION_ID!,
    prefix: process.env.PREFIX || '*',
    tenorApiKey: process.env.TENOR_API_KEY!
}
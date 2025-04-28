export class GeminiServiceError extends Error {
    constructor(
        message: string,
        public code: string,
        public originalError?: any
    ) {
        super(message);
        this.name = 'GeminiServiceError';
    }
}

export const ErrorCodes = {
    DATABASE_ERROR: 'DB_ERROR',
    API_ERROR: 'API_ERROR',
    CONVERSION_ERROR: 'CONVERSION_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR'
} as const; 
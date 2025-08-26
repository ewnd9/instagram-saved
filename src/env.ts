import { z } from 'zod';

const envSchema = z.object({
    DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
    INSTAGRAM_USERNAME: z.string().min(1, 'INSTAGRAM_USERNAME is required'),
    INSTAGRAM_PASSWORD: z.string().min(1, 'INSTAGRAM_PASSWORD is required'),
    HEADLESS: z.string().default('true').transform((val) => val === 'true')
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
    console.log('🔍 Validating environment variables...');
    const result = envSchema.safeParse(process.env);
    
    if (!result.success) {
        console.error('❌ Environment validation failed:');
        result.error.issues.forEach((issue) => {
            console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
        });
        console.error('\nPlease check your .env file and ensure all required variables are set correctly.');
        process.exit(1);
    }
    
    return result.data;
}
import { z } from 'zod';

const cliEnvSchema = z.object({
    INSTAGRAM_USERNAME: z.string().min(1, 'INSTAGRAM_USERNAME is required'),
    INSTAGRAM_PASSWORD: z.string().min(1, 'INSTAGRAM_PASSWORD is required'),
    HEADLESS: z.string().default('true').transform((val) => val === 'true'),
    WEB_API: z.string().url().default('http://localhost:3000')
});

export type CliEnv = z.infer<typeof cliEnvSchema>;

export function validateCliEnv(): CliEnv {
    console.log('🔍 Validating CLI environment variables...');
    const result = cliEnvSchema.safeParse(process.env);
    
    if (!result.success) {
        console.error('❌ CLI environment validation failed:');
        result.error.issues.forEach((issue) => {
            console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
        });
        console.error('\nPlease check your .env file and ensure all required variables are set correctly.');
        process.exit(1);
    }
    
    return result.data;
}
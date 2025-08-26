import { z } from 'zod';

const coreEnvSchema = z.object({
    DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL')
});

export type CoreEnv = z.infer<typeof coreEnvSchema>;

export function validateCoreEnv(): CoreEnv {
    console.log('🔍 Validating core environment variables...');
    const result = coreEnvSchema.safeParse(process.env);
    
    if (!result.success) {
        console.error('❌ Core environment validation failed:');
        result.error.issues.forEach((issue) => {
            console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
        });
        console.error('\nPlease check your .env file and ensure all required variables are set correctly.');
        process.exit(1);
    }
    
    return result.data;
}
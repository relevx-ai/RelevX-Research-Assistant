import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { logger } from "../logger";

const region = 'us-east-1';

// Initialize AWS Secrets Manager Client
// Credentials will be automatically resolved from the environment or default provider chain
const client = new SecretsManagerClient({ region });

export const aws = {
    getSecret: async (secretId: string): Promise<string | undefined> => {
        try {
            const command = new GetSecretValueCommand({ SecretId: secretId });
            const response = await client.send(command);

            if (response.SecretString) {
                return response.SecretString;
            }

            // Handle binary secrets if needed, though typically configuration is string
            if (response.SecretBinary) {
                return Buffer.from(response.SecretBinary).toString('utf-8');
            }

            return undefined;
        } catch (error) {
            logger.error(`Failed to retrieve secret ${secretId} from AWS Secrets Manager`, { error });
            throw error;
        }
    }
};

export async function loadAwsSecrets(secretName: string) {
    try {
        const secrets = await aws.getSecret(secretName);
        if (secrets) {
            const parsedSecrets = JSON.parse(secrets);
            for (const [key, value] of Object.entries(parsedSecrets)) {
                process.env[key] = value as string;
            }
            logger.info(`Loaded secrets from AWS Secrets Manager: ${secretName}`);
            return true;
        }
    } catch (error) {
        logger.warn("Failed to load secrets from AWS Secrets Manager", { error });
    }
    return false;
}

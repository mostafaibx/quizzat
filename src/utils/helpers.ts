import { getCloudflareContext } from '@opennextjs/cloudflare';

// Get Cloudflare context in async mode
export async function getEnv() {
  try {
    const cfContext = await getCloudflareContext({ async: true });
    if (cfContext && cfContext.env) {
      return {
        ...cfContext.env,
        NODE_ENV: process.env.NODE_ENV,
      };
    }
  } catch (error) {
    console.warn('Failed to get Cloudflare context:', error);
  }

  // Fallback to process.env (this should not happen in production)
  return process.env as Record<string, string>;
}

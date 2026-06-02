import { API_BASE_URL } from '@/config/env';

/**
 * Pure URL builder for the recommendations share-link feature. Lives on the
 * client because the URL is rendered into the UI for the user to copy; no auth
 * needed (the token itself authenticates the public download).
 */
export const recommendationShareUrls = {
  buildShareDownloadUrl: (workspaceId: string, token: string): string =>
    `${API_BASE_URL}/api/public/export/conll/${workspaceId}?token=${encodeURIComponent(token)}`,
};

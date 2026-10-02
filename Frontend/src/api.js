// Single source of truth is src/api/client.js
import apiClient, { resolveMediaUrl } from './api/client';

export const getMediaUrl = resolveMediaUrl;
export default apiClient;

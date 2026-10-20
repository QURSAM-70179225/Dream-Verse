import { apiRequest } from './api.js';

// Thin wrappers around the /api/ai endpoints. The AI provider key never reaches the browser:
// the browser only talks to the DreamVerse server.
export const getConversation = (token) => apiRequest('/ai/conversation', { token });
export const sendChat = (token, message) =>
  apiRequest('/ai/chat', { method: 'POST', token, body: { message } });
export const clearConversation = (token) => apiRequest('/ai/conversation', { method: 'DELETE', token });
export const generateFuture = (token, dreamId) =>
  apiRequest('/ai/generate-future', { method: 'POST', token, body: dreamId ? { dreamId } : {} });
export const generateRoadmap = (token, dreamId) =>
  apiRequest('/ai/generate-roadmap', { method: 'POST', token, body: dreamId ? { dreamId } : {} });

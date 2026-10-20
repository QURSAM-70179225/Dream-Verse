import { apiRequest } from './api.js';

// `choice` is 'A' or 'B'. Give either a saved `scenarioId` or a custom { title, optionA, optionB }.
export const makeDecision = (token, body) =>
  apiRequest('/simulation/decisions', { method: 'POST', token, body });

export const getHistory = (token, limit = 20) =>
  apiRequest(`/simulation/history?limit=${limit}`, { token });

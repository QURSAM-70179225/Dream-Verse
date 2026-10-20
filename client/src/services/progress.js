import { apiRequest } from './api.js';

// Ticking a task, and telling the server which part of the 3D world was entered.
// XP and achievements are always decided by the server.
export const setTaskDone = (token, milestoneId, taskId, done) =>
  apiRequest(`/progress/milestones/${milestoneId}`, { method: 'PATCH', token, body: { taskId, done } });

export const recordVisit = (token, location) =>
  apiRequest('/progress/visit', { method: 'POST', token, body: { location } });

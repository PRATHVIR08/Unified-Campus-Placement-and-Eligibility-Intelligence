import { apiClient } from './client';

export async function askChatbot({ message, companyId, history }) {
  return apiClient('/chatbot/ask', {
    method: 'POST',
    body: JSON.stringify({
      message,
      ...(companyId ? { companyId } : {}),
      history,
    }),
  });
}

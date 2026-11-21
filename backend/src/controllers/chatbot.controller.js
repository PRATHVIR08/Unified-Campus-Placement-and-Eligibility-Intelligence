const env = require('../config/env');
const chatbotService = require('../services/chatbotService');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HISTORY_LIMIT = 10;

function redactError(value, message) {
  let text = String(value || 'Unknown error');
  if (env.geminiApiKey) text = text.split(env.geminiApiKey).join('[REDACTED]');
  if (message) text = text.split(message).join('[USER MESSAGE]');
  return text;
}

exports.ask = async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'A JSON request body is required' });
  }

  if (typeof body.message !== 'string' || !body.message.trim() || body.message.trim().length > 1000) {
    return res.status(400).json({ error: 'Message is required and must be 1000 characters or fewer' });
  }

  for (const field of ['companyId', 'driveId']) {
    if (body[field] !== undefined && (typeof body[field] !== 'string' || !UUID.test(body[field]))) {
      return res.status(400).json({ error: `Invalid ${field}` });
    }
  }

  const history = body.history === undefined ? [] : body.history;
  if (!Array.isArray(history) || history.length > HISTORY_LIMIT) {
    return res.status(400).json({ error: 'History must contain at most 10 messages' });
  }
  if (history.some((item) => (
    !item ||
    !['user', 'assistant'].includes(item.role) ||
    typeof item.text !== 'string' ||
    !item.text.trim() ||
    item.text.trim().length > 2000
  ))) {
    return res.status(400).json({ error: 'Each history item needs a valid role and text of 2000 characters or fewer' });
  }

  if (!env.geminiApiKey) {
    return res.status(503).json({ error: 'Chatbot is not configured' });
  }

  const message = body.message.trim();
  try {
    let context;
    try {
      context = await chatbotService.buildContext({
        companyId: body.companyId,
        driveId: body.driveId,
      });
    } catch (error) {
      console.error('[CHATBOT] Placement context lookup failed:', {
        code: error.code,
        message: redactError(error.message, message),
      });
      return res.status(503).json({ error: 'Placement data is temporarily unavailable.' });
    }

    try {
      const answer = await chatbotService.askGemini({
        message,
        history: history.map(({ role, text }) => ({ role, text: text.trim() })),
        context,
      });
      return res.json({ answer });
    } catch (error) {
      console.error('[CHATBOT] Gemini request failed:', {
        name: redactError(error.name, message),
        code: error.code,
        message: redactError(error.message, message),
      });
      return res.status(502).json({ error: 'The assistant is unavailable right now.' });
    }
  } catch (error) {
    console.error('[CHATBOT] Unexpected request failure:', {
      name: redactError(error.name, message),
      message: redactError(error.message, message),
    });
    return res.status(502).json({ error: 'The assistant is unavailable right now.' });
  }
};

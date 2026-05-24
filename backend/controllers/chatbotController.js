const axios = require('axios');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `
You are TMS Assistant, a helpful AI chatbot inside a Traffic Management System.
Your job is to be practical, page-aware, and action-oriented.

You can help with:
- Citizen challan lookup, payment steps, receipt guidance, and appeal preparation.
- Understanding challan fields: challan number, violation, amount, status, due date, location.
- Traffic alerts: Low, Medium, High, Critical, alternate-route advice, and safety guidance.
- Officer workflows: adding violations, choosing traffic level, drafting incident reports, and writing concise descriptions.
- Explaining what to click in this app based on the current page path.

Important app routes:
- /public: public dashboard for live alerts and quick links.
- /public/traffic-info: full traffic situation list and map.
- /public/challan-tracker: anonymous challan lookup by vehicle number.
- /public/account: registered citizen dashboard, personal challans, payment, map.
- /officer-dashboard: officer tools for violations, challans, reports, and traffic situations.
- /login: officer/system login.

Answer style:
- Keep answers short unless the user asks for detail.
- Use clear steps when describing an action.
- Mention the exact page/button when useful.
- If asked about a specific challan and challan data is provided, explain it directly.
- Do not claim to complete real payment, legal appeal, cancellation, or official enforcement.
- For payment/appeal/legal questions, guide the user to the app workflow or traffic support.
- If backend/API/server is down, tell the user to start backend on localhost:5000 and retry.
`;

const sanitizeHistory = (messages = []) => messages
  .filter((message) => message && ['user', 'model'].includes(message.role) && message.text)
  .slice(-10)
  .map((message) => ({
    role: message.role,
    parts: [{ text: String(message.text).slice(0, 2000) }],
  }));

const parseChallanFromMessage = (message = '') => {
  const marker = 'Challan data:';
  const index = String(message).indexOf(marker);
  if (index === -1) return null;

  try {
    return JSON.parse(String(message).slice(index + marker.length).trim());
  } catch (error) {
    return null;
  }
};

const buildLocalFallbackReply = (message, context = {}) => {
  const challan = parseChallanFromMessage(message);
  if (challan) {
    const violation = challan.violation?.violationType || challan.ViolationType || challan.DisplayViolationType || 'traffic violation';
    const amount = Number(challan.fineAmount || challan.FineAmount || 0).toLocaleString();
    const payment = challan.paymentStatus || challan.PaymentStatus || 'Unpaid';
    const status = challan.challanStatus || challan.ChallanStatus || 'Issued';
    const location = challan.location?.locationName || challan.LocationName || challan.Location || 'the recorded location';
    const challanNumber = challan.challanNumber || challan.ChallanNumber || 'this challan';

    return [
      `${challanNumber}: this challan is for ${violation} at ${location}.`,
      `Fine amount: Rs.${amount}. Payment status: ${payment}. Challan status: ${status}.`,
      payment === 'Paid' || payment === 'Waived'
        ? 'No payment is currently due for this challan.'
        : 'Next step: pay it from the public challan/payment panel, or submit an appeal from the Appeal Center if you believe it needs review.',
    ].join(' ');
  }

  const role = context.role ? ` for ${context.role}` : '';
  return `I can still help${role}. Gemini is temporarily unavailable, but you can ask about challans, payments, appeals, traffic alerts, or officer workflows.`;
};

exports.askGemini = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const { message, history = [], context = {} } = req.body;

    if (!apiKey) {
      return res.json({
        success: true,
        data: {
          reply: buildLocalFallbackReply(message, context),
          model: 'local-fallback',
        },
      });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    const pageContext = [
      context.path ? `Current page: ${context.path}` : '',
      context.role ? `User role: ${context.role}` : '',
      context.vehicleNumber ? `Vehicle number: ${context.vehicleNumber}` : '',
      context.pageTitle ? `Page title: ${context.pageTitle}` : '',
      context.trafficSummary ? `Traffic summary: ${context.trafficSummary}` : '',
      context.challanSummary ? `Challan summary: ${context.challanSummary}` : '',
      context.availableActions ? `Available app actions: ${context.availableActions}` : '',
    ].filter(Boolean).join('\n');

    const response = await axios.post(
      GEMINI_ENDPOINT,
      {
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          ...sanitizeHistory(history),
          {
            role: 'user',
            parts: [{
              text: `${pageContext ? `${pageContext}\n\n` : ''}${String(message).trim()}`,
            }],
          },
        ],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 700,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        timeout: 30000,
      }
    );

    const text = response.data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();

    return res.json({
      success: true,
      data: {
        reply: text || 'I could not generate a response right now. Please try again.',
        model: GEMINI_MODEL,
      },
    });
  } catch (error) {
    console.error('Gemini chatbot error:', error.response?.data || error.message);
    return res.json({
      success: true,
      data: {
        reply: buildLocalFallbackReply(req.body?.message, req.body?.context),
        model: 'local-fallback',
        warning: error.response?.data?.error?.message || 'Gemini chatbot failed to respond',
      },
    });
  }
};

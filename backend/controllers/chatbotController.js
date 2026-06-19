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

const pickViolationType = (text = '') => {
  const lower = text.toLowerCase();
  if (lower.includes('helmet')) return 'No Helmet';
  if (lower.includes('seat') || lower.includes('belt')) return 'No Seat Belt';
  if (lower.includes('speed')) return 'Speeding';
  if (lower.includes('red') || lower.includes('signal')) return 'Red Light Violation';
  if (lower.includes('phone') || lower.includes('mobile')) return 'Mobile Phone Usage';
  if (lower.includes('park')) return 'Illegal Parking';
  if (lower.includes('drunk') || lower.includes('alcohol')) return 'Drunk Driving';
  if (lower.includes('reckless')) return 'Reckless Driving';
  return 'Other';
};

const pickSeverity = (text = '') => {
  const lower = text.toLowerCase();
  if (lower.includes('critical') || lower.includes('danger') || lower.includes('drunk') || lower.includes('reckless')) return 'Critical';
  if (lower.includes('major') || lower.includes('high') || lower.includes('red light')) return 'Major';
  if (lower.includes('minor') || lower.includes('low')) return 'Minor';
  return 'Moderate';
};

const extractOfficerJson = (message = '') => {
  const raw = String(message || '');
  const note = raw.split('Officer note:').pop() || raw;
  const plate = note.match(/[A-Z]{2,4}[-\s]?\d{3,5}/i)?.[0] || '';
  const phone = note.match(/(?:\+?92|0)?3\d{9}/)?.[0] || '';
  const speedPair = note.match(/(\d{2,3})\s*(?:in|on|\/)\s*(\d{2,3})\s*(?:zone|limit)?/i);
  const speedSingle = note.match(/speed(?:ing)?\s*(\d{2,3})/i);
  const location = note.match(/(?:at|near|on)\s+([a-z0-9\s-]{3,60})(?:,| owner| phone| minor| moderate| major| critical|$)/i)?.[1] || '';
  const owner = note.match(/owner\s+([a-z\s.]{2,60})(?:,| phone| at| near| on| \d|$)/i)?.[1] || '';

  return {
    registrationNumber: plate.toUpperCase().replace(/\s+/g, ''),
    ownerName: owner.trim().replace(/\s+/g, ' '),
    ownerPhone: phone,
    violationType: pickViolationType(note),
    severity: pickSeverity(note),
    speed: speedPair?.[1] || speedSingle?.[1] || '',
    speedLimit: speedPair?.[2] || '',
    locationName: location.trim().replace(/\s+/g, ' '),
    description: note.trim(),
  };
};

const buildLocalFallbackReply = (message, context = {}) => {
  const rawMessage = String(message || '');
  const lower = rawMessage.toLowerCase();

  if (lower.includes('return only json') || lower.includes('extract a traffic challan form')) {
    return JSON.stringify(extractOfficerJson(rawMessage), null, 2);
  }

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

  if (lower.includes('pay')) {
    return 'To pay a challan, open Public Tracker or Citizen Account, search/select the vehicle, review pending challans, then use the Pay button. After payment, download or print the receipt.';
  }

  if (lower.includes('appeal')) {
    return 'To appeal, open Citizen Account, choose the challan, click Appeal, add your reason and evidence, then submit it for officer review.';
  }

  if (lower.includes('traffic') || lower.includes('critical') || lower.includes('route')) {
    return 'Traffic levels mean: Low is normal, Medium needs caution, High means delay expected, and Critical means avoid the road if possible. Open Public Traffic Info for the live map and latest alerts.';
  }

  if (lower.includes('demerit') || lower.includes('license')) {
    return 'Demerit points are added from violations. At 100 points the license is marked cancelled. Citizens can request a reduction or complete an eligible safety course from Citizen Account.';
  }

  if (lower.includes('check') && lower.includes('challan')) {
    return 'Open Public Tracker, enter the vehicle registration number, then press Search. Registered citizens can also view their linked challans in Citizen Account.';
  }

  if (lower.includes('officer') || lower.includes('violation') || lower.includes('fill')) {
    return 'Officer workflow: open Officer Dashboard, choose Add Violation, enter vehicle and violation details, review fine and demerit points, then submit to generate the challan.';
  }

  const role = context.role ? ` for ${context.role}` : '';
  return `I can help${role} with challans, payments, appeals, traffic alerts, demerit points, license status, and officer workflows. Ask one specific question and I will guide you.`;
};

const shouldAnswerLocally = (message = '') => {
  const lower = String(message || '').toLowerCase();
  return lower.includes('return only json')
    || lower.includes('extract a traffic challan form')
    || lower.includes('challan data:')
    || lower.includes('how do i pay')
    || lower.includes('check my challan')
    || lower.includes('appeal')
    || lower.includes('demerit')
    || lower.includes('license')
    || lower.includes('traffic levels')
    || lower.includes('critical mean');
};

exports.askGemini = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const { message, history = [], context = {} } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    if (!apiKey || shouldAnswerLocally(message)) {
      return res.json({
        success: true,
        data: {
          reply: buildLocalFallbackReply(message, context),
          model: 'local-tms',
        },
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
        timeout: 12000,
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

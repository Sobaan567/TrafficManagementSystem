import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import './GeminiChatbot.css';

const getPagePrompts = (path, role) => {
  if (path.includes('challan')) {
    return ['Explain my challan', 'How do I pay?', 'Can I appeal a challan?'];
  }
  if (path.includes('officer')) {
    return ['Draft incident report', 'Suggest traffic level', 'Help fill violation form'];
  }
  if (path.includes('traffic-info') || path === '/public') {
    return ['Summarize city traffic', 'What does Critical mean?', 'Which roads should I avoid?'];
  }
  if (role === 'Public') {
    return ['Explain my pending challans', 'What should I pay first?', 'Summarize road risk'];
  }
  return ['How do I check my challan?', 'What do traffic levels mean?', 'How can I pay a challan?'];
};

const getPageContext = (path, role, trafficSummary) => {
  if (path.includes('challan')) {
    return {
      pageTitle: 'Challan tracker',
      availableActions: 'Search vehicle challans, explain challans, pay unpaid challans, print receipt',
      challanSummary: 'User may be viewing anonymous vehicle challans',
    };
  }
  if (path.includes('officer')) {
    return {
      pageTitle: 'Officer dashboard',
      availableActions: 'Add violation, report traffic situation, view map, view reports, manage challans',
    };
  }
  if (path.includes('traffic-info')) {
    return {
      pageTitle: 'Public traffic information',
      availableActions: 'View traffic map, read active traffic situations, open Google Maps locations',
      trafficSummary,
    };
  }
  if (path === '/public') {
    return {
      pageTitle: 'Public dashboard',
      availableActions: 'Open challan tracker, open live traffic info, citizen login',
      trafficSummary,
    };
  }
  if (path.includes('account') || role === 'Public') {
    return {
      pageTitle: 'Registered citizen dashboard',
      availableActions: 'Review personal challans, pay pending challans, explain challans, view city pulse',
      trafficSummary,
    };
  }
  return {
    pageTitle: 'Traffic Management System',
    availableActions: 'Open public dashboard, login as officer, ask about traffic or challans',
    trafficSummary,
  };
};

const quickActions = [
  { label: 'Open Traffic', path: '/public/traffic-info' },
  { label: 'Check Challan', path: '/public/challan-tracker' },
  { label: 'Citizen Account', path: '/public/account' },
];

const getLocalAnswer = (prompt, path) => {
  const text = prompt.toLowerCase();
  if (text.includes('backend') || text.includes('server not reachable')) {
    return 'Start the backend on port 5000, then press Retry. Use START_SERVERS.bat from the project root for the most reliable startup.';
  }
  if (text.includes('pay')) {
    return 'To pay: open Public Portal > Check Challans, search your vehicle number, review pending challans, then press Pay Now. Registered citizens can also pay from My Account.';
  }
  if (text.includes('check') && text.includes('challan')) {
    return 'Open Public Portal > Check Challans, enter your vehicle registration number, then press Search. You can do this without logging in.';
  }
  if (text.includes('critical')) {
    return 'Critical means the road has severe congestion or an incident. Avoid it if possible, follow officer instructions, and use alternate routes.';
  }
  if (text.includes('where am i') || text.includes('page')) {
    return `You are currently on ${path}. I can guide you to traffic info, challan lookup, citizen account, or officer tools.`;
  }
  return '';
};

const formatMessage = (text) => String(text || '')
  .replace(/\*\*(.*?)\*\*/g, '$1')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

export default function GeminiChatbot() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [trafficSummary, setTrafficSummary] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: 'Hi, I am TMS Assistant. Ask me about challans, traffic alerts, payments, or officer workflows.',
    },
  ]);

  const history = useMemo(() => messages
    .filter((message) => ['user', 'model'].includes(message.role))
    .slice(-8), [messages]);
  const starterPrompts = useMemo(() => getPagePrompts(location.pathname, user?.role || 'Guest'), [location.pathname, user?.role]);
  const pageContext = useMemo(() => getPageContext(location.pathname, user?.role || 'Guest', trafficSummary), [location.pathname, trafficSummary, user?.role]);

  useEffect(() => {
    if (!open) return;

    const fetchTrafficSummary = async () => {
      try {
        const response = await api.get('/traffic/situations');
        const rows = response.data?.data || [];
        if (!rows.length) {
          setTrafficSummary('No active traffic situations reported.');
          return;
        }

        const counts = rows.reduce((acc, row) => {
          const level = row.trafficLevel || row.TrafficLevel || 'Low';
          acc[level] = (acc[level] || 0) + 1;
          return acc;
        }, {});
        const top = rows.slice(0, 3).map((row) => `${row.LocationName || row.locationName} (${row.TrafficLevel || row.trafficLevel})`).join(', ');
        setTrafficSummary(`${rows.length} active alerts. Counts: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(', ')}. Latest: ${top}`);
      } catch (error) {
        setTrafficSummary('Traffic backend is currently unreachable.');
      }
    };

    fetchTrafficSummary();
  }, [open]);

  const sendMessage = async (text = input) => {
    const prompt = text.trim();
    if (!prompt || loading) return;

    const nextMessages = [...messages, { role: 'user', text: prompt }];
    setMessages(nextMessages);
    setInput('');

    const localAnswer = getLocalAnswer(prompt, location.pathname);
    if (localAnswer) {
      setMessages([...nextMessages, { role: 'model', text: localAnswer }]);
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/chatbot/ask', {
        message: prompt,
        history,
        context: {
          path: location.pathname,
          role: user?.role || 'Guest',
          vehicleNumber: user?.vehicleNumber,
          ...pageContext,
        },
      });

      setMessages((current) => [
        ...current,
        { role: 'model', text: formatMessage(response.data?.data?.reply || 'I could not answer that right now.') },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: 'model',
          text: error.response?.data?.message || 'Gemini is not connected yet. Add GEMINI_API_KEY in backend/.env and restart the backend.',
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`gemini-chatbot ${open ? 'open' : ''}`}>
      {open && (
        <section className="gemini-panel">
          <header>
            <div>
              <span>Gemini 2.5 Flash</span>
              <h2>TMS Assistant</h2>
              <small>{location.pathname}</small>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chatbot">X</button>
          </header>

          <div className="gemini-messages">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`gemini-message ${message.role} ${message.error ? 'error' : ''}`}>
                {formatMessage(message.text)}
              </div>
            ))}
            {loading && <div className="gemini-message model thinking">Thinking...</div>}
          </div>

          <div className="gemini-starters">
            {starterPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => sendMessage(prompt)} disabled={loading}>
                {prompt}
              </button>
            ))}
          </div>

          <div className="gemini-actions">
            {quickActions.map((action) => (
              <button
                key={action.path}
                type="button"
                onClick={() => {
                  navigate(action.path);
                  setOpen(false);
                }}
              >
                {action.label}
              </button>
            ))}
          </div>

          <form onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask the traffic assistant..."
            />
            <button type="submit" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>
        </section>
      )}

      <button type="button" className="gemini-launcher" onClick={() => setOpen((current) => !current)}>
        AI
      </button>
    </div>
  );
}

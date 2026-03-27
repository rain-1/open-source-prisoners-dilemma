import { Decision } from '../types';

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'stepfun/step-3.5-flash:free';

export async function askParticipantDecision(
  systemPrompt: string,
  partnerPrompt: string
): Promise<{ decision: Decision; rawResponse: string; reasoning?: string }> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Prisoners Dilemma Tournament Local',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `You are playing the Prisoner's Dilemma against a partner.\n\nYOUR SYSTEM INSTRUCTIONS (You must follow these):\n"${systemPrompt}"`
          },
          {
            role: 'user',
            content: `YOUR PARTNER'S SYSTEM INSTRUCTIONS (They will follow these):\n"${partnerPrompt}"\n\nBased on your instructions and your partner's instructions, you must choose to either cooperate or defect.\nOutput EXACTLY ONE WORD: "cooperate" or "defect". Do not include any punctuation, explanation, or other text. Just the single word.`
          }
        ],
        temperature: 0,
        reasoning: { enabled: true }
      }),
    });

    if (!response.ok) {
      console.error('OpenRouter API error:', response.statusText);
      return { decision: 'error', rawResponse: `HTTP Error ${response.status}`, reasoning: '' };
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    const content = message?.content?.trim().toLowerCase() || '';
    
    const extractText = (val: any) => {
      if (Array.isArray(val)) {
        return val.map((item: any) => item.text || JSON.stringify(item)).join('\n\n');
      }
      return typeof val === 'string' ? val : JSON.stringify(val, null, 2);
    };

    let reasoning = 'No reasoning returned.';
    if (message?.reasoning_details) {
      reasoning = extractText(message.reasoning_details);
    } else if (message?.reasoning) {
      reasoning = extractText(message.reasoning);
    }
    
    // Some models/OpenRouter endpoints return double-escaped actual '\n' text in JSON values
    if (typeof reasoning === 'string') {
      reasoning = reasoning.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    }

    // Find the last occurrence of each word in case the model thinks out loud
    const cIndex = content.lastIndexOf('cooperate');
    const dIndex = content.lastIndexOf('defect');

    if (cIndex === -1 && dIndex === -1) {
      // Sometimes it outputs purely in the reasoning and leaves content blank or weird.
      // We will fallback to parsing the reasoning string if content gives nothing!
      const r_cIndex = reasoning.toLowerCase().lastIndexOf('cooperate');
      const r_dIndex = reasoning.toLowerCase().lastIndexOf('defect');
      
      if (r_cIndex === -1 && r_dIndex === -1) {
        return { decision: 'error', rawResponse: content || 'No output', reasoning };
      }
      if (r_cIndex > r_dIndex) {
        return { decision: 'cooperate', rawResponse: content, reasoning };
      } else {
        return { decision: 'defect', rawResponse: content, reasoning };
      }
    }

    if (cIndex > dIndex) {
      return { decision: 'cooperate', rawResponse: content, reasoning };
    } else {
      return { decision: 'defect', rawResponse: content, reasoning };
    }
  } catch (error) {
    console.error('Network error calling OpenRouter:', error);
    return { decision: 'error', rawResponse: String(error), reasoning: '' };
  }
}

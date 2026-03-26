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
            role: 'user',
            content: `You are playing the Prisoner's Dilemma against a partner. 

YOUR SYSTEM INSTRUCTIONS (You must follow these):
"${systemPrompt}"

YOUR PARTNER'S SYSTEM INSTRUCTIONS (They will follow these):
"${partnerPrompt}"

Based on your instructions and your partner's instructions, you must choose to either cooperate or defect.
Output EXACTLY ONE WORD: "cooperate" or "defect". Do not include any punctuation, explanation, or other text. Just the single word.`
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
    
    // Extract reasoning format which can be a string or complex object
    let reasoning = 'No reasoning returned.';
    if (message?.reasoning_details) {
      reasoning = typeof message.reasoning_details === 'string' 
        ? message.reasoning_details 
        : JSON.stringify(message.reasoning_details, null, 2);
    } else if (message?.reasoning) {
      reasoning = message.reasoning;
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

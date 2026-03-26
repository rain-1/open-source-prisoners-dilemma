import { Participant } from '../types';

// Load all text files in the prompts directory
// @ts-ignore
const promptModules = import.meta.glob('../../prompts/**/*.txt', { query: '?raw', import: 'default', eager: true });

function toTitleCase(str: string) {
  return str.replace(/_/g, ' ')
            .replace(/.txt$/, '')
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
}

export interface PromptFolder {
  name: string;
  participants: Participant[];
}

export function loadPromptFolders(): PromptFolder[] {
  const folderMap = new Map<string, Participant[]>();
  let idCounter = 1;

  for (const path in promptModules) {
    const content = promptModules[path] as string;
    
    // Path looks like "../../prompts/simple/cooperate.txt"
    const parts = path.split('/');
    const fileName = parts.pop()!;
    const folderName = parts.pop() || 'root';
    
    const displayName = folderName === 'prompts' ? 'root' : folderName;
    const name = toTitleCase(fileName);

    const participant: Participant = {
      id: String(idCounter++),
      name,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${name.replace(/ /g, '')}`,
      systemPrompt: content.trim(),
      score: 0
    };

    if (!folderMap.has(displayName)) {
      folderMap.set(displayName, []);
    }
    folderMap.get(displayName)!.push(participant);
  }

  const result: PromptFolder[] = [];
  folderMap.forEach((participants, name) => {
    result.push({ name, participants });
  });

  // Sort folders alphabetically
  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

export const DEFAULT_PARTICIPANTS: Participant[] = loadPromptFolders()[0]?.participants || [];
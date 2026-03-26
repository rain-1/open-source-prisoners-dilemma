const fs = require('fs');
const path = require('path');

const promptsDir = './prompts';
const files = fs.readdirSync(promptsDir).filter(f => f.endsWith('.txt'));

const toTitleCase = (str) => {
  return str.replace(/_/g, ' ').replace(/.txt$/, '').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

let participants = [];

files.forEach((file, index) => {
  const content = fs.readFileSync(path.join(promptsDir, file), 'utf-8');
  const name = toTitleCase(file);
  participants.push({
    id: (index + 1 + 100).toString(), // start ids high to avoid clash
    name: name,
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${name.replace(/ /g, '')}`,
    systemPrompt: content.trim().replace(/`/g, '\\`'),
    score: 0
  });
});

const tsContent = `import { Participant } from '../types';\n\nexport const DEFAULT_PARTICIPANTS: Participant[] = ${JSON.stringify(participants, null, 2)};`;

fs.writeFileSync('./src/game/defaults.ts', tsContent);
console.log('Successfully updated defaults.ts with ' + participants.length + ' prompts.');

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore
import fs from 'node:fs'
// @ts-ignore
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'tournament-streamer',
      // @ts-ignore
      configureServer(server) {
        // @ts-ignore
        server.middlewares.use('/api/save-match', (req, res) => {
          let body = '';
          // @ts-ignore
          req.on('data', chunk => { body += chunk.toString() });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const dir = path.resolve(__dirname, 'touranments');
              if (!fs.existsSync(dir)) fs.mkdirSync(dir);
              
              const file = path.resolve(dir, 'live_tournament.ndjson');
              fs.appendFileSync(file, JSON.stringify(data) + '\n');
              
              res.statusCode = 200;
              res.end('saved');
            } catch (e) {
              res.statusCode = 500;
              res.end(String(e));
            }
          });
        });
      }
    }
  ],
})

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.BACKEND_PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || '',
  defaultAdmin: {
    username: process.env.DEFAULT_ADMIN_USER || 'admin',
    password: process.env.DEFAULT_ADMIN_PASSWORD || '',
  },
  ts3audiobot: {
    url: process.env.TS3AUDIOBOT_URL || 'http://localhost:58913',
    apiKey: process.env.TS3AUDIOBOT_API_KEY || '',
  },
  ts3server: {
    host: process.env.TS3_SERVER_HOST || 'localhost',
    port: parseInt(process.env.TS3_SERVER_PORT || '9987', 10),
    queryPort: parseInt(process.env.TS3_SERVER_QUERY_PORT || '10011', 10),
    queryUser: process.env.TS3_SERVER_QUERY_USER || 'serveradmin',
    queryPassword: process.env.TS3_SERVER_QUERY_PASSWORD || '',
  },
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID || '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3001/api/spotify/callback',
  },
  dataDir: process.env.DATA_DIR || path.resolve(__dirname, '../data'),
};

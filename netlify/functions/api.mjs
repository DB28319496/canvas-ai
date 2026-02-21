import serverless from 'serverless-http';
import { createApp } from '../../server/app.js';

// Set up serverless storage paths
process.env.UPLOADS_DIR = process.env.UPLOADS_DIR || '/tmp/uploads';
process.env.PROJECTS_DIR = process.env.PROJECTS_DIR || '/tmp/projects';

const app = createApp();
const handler = serverless(app);

export { handler };

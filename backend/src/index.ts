import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerArtistRoutes } from './routes/artists.js';
import { registerContentRoutes } from './routes/content.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerSongUploadRoutes } from './routes/songs-upload.js';
import { registerVideoUploadRoutes } from './routes/videos-upload.js';
import { registerMerchUploadRoutes } from './routes/merch-upload.js';

// Combine app and auth schemas
const schema = { ...appSchema, ...authSchema };

// Create application with full schema
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable authentication with Google, Apple OAuth and storage
app.withAuth();
app.withStorage();

// Register all route modules - order doesn't matter as they're independent
registerArtistRoutes(app);
registerContentRoutes(app);
registerAdminRoutes(app);
registerSongUploadRoutes(app);
registerVideoUploadRoutes(app);
registerMerchUploadRoutes(app);

await app.run();
app.logger.info('Application running');

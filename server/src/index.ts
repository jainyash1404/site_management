import mongoose from 'mongoose';
import { app } from './app.js';
import { config } from './config.js';

await mongoose.connect(config.mongoUri);
const server = app.listen(config.port, () => console.log(`API listening on :${config.port} (receipts: ${config.cloudinary ? 'Cloudinary' : 'local disk'})`));
const stop = () => server.close(() => mongoose.disconnect().then(() => process.exit(0)));
process.on('SIGTERM', stop); process.on('SIGINT', stop);

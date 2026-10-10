import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import adminRoutes from './routes/adminRoutes.js';
// 🌟 1. IMPORT YOUR WHATSAPP WEBHOOK CONTROLLER HANDLER
import { handleIncomingWebhook } from './controllers/webhookController.js'; 
// 🌟 2. IMPORT THE MESSAGE LOG MODEL TO REBUILD EXPRIRY INDEXES
import MessageLog from './models/MessageLog.js';

dotenv.config();

const app = express();

// Middleware Layer
app.use(cors());
app.use(express.json());

// Database Connection
await connectDB();

// 🌟 3. FIXED: Drop old regular index first, then sync the 10-day TTL options
// This resolves the "An equivalent index already exists with different options" engine block!
try {
  await MessageLog.collection.dropIndex("timestamp_1");
  console.log('🗑️ Old conflicting plain index dropped successfully.');
} catch (dropErr) {
  // If the index isn't there or was already dropped, ignore and proceed
  console.log('ℹ️ Index drop skipped: Plain index already removed or collection empty.');
}

try {
  await MessageLog.syncIndexes();
  console.log('⚡ MongoDB TTL Expiry Indexes Synced Successfully.');
} catch (indexErr) {
  console.error('⚠️ Failed syncing TTL indexes:', indexErr.message);
}

// 🌟 4. MICROSERVICE ROUTING CONNECTIONS
// React Dashboard Admin Panel Access Path
app.use('/api/admin', adminRoutes);

// 🌟 5. WHATSAPP WEBHOOK VERIFICATION ENDPOINT (GET)
// Required by Meta to perform the initial token handshake setup
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
      console.log('✅ WHATSAPP_WEBHOOK_VERIFIED_SUCCESSFULLY');
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }
});

// 🌟 6. WHATSAPP INCOMING MESSAGES EVENT RECEIVER (POST)
// Captures live text strings, option clicks, and payment images from customers
app.post('/webhook', handleIncomingWebhook);

// 🌟 7. Keep-Alive / Health Check Endpoint for Cron Jobs
// Prevents Render Free Tier from going to sleep after 15 minutes of inactivity
app.get(['/ping', '/ping/'], (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({ status: "active", timestamp: new Date() });
});

// Catch-all 404 route for debug visibility
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found on this server.` });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`📡 Server running smoothly on port: ${PORT}`);
});
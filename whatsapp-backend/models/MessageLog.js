import mongoose from 'mongoose';

const messageLogSchema = new mongoose.Schema({
  phone_number: { type: String, required: true, index: true },
  sender: { type: String, enum: ['user', 'bot', 'admin'], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true }
});

// 🌟 ADDED: Time-To-Live (TTL) Index for Automatic 10-Day Background Purging
// 10 days = 10 * 24 * 60 * 60 = 864,000 seconds
messageLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 864000 });

export default mongoose.model('MessageLog', messageLogSchema);
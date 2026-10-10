import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'global_settings' },
  qr_code_url: { type: String, default: '' } // Changed from required: true to default: '' to prevent initialization crashes!
});

export default mongoose.model('Settings', settingsSchema);
import mongoose from 'mongoose';

const configSchema = new mongoose.Schema({
  _id: { type: String, default: 'global_config' },
  is_automation_on: { type: Boolean, default: true }
});

export default mongoose.model('Config', configSchema); // <-- Verify this
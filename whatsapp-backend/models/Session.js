import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  _id: { type: String }, // Stored phone number string key
  state: { type: String, default: 'START' },
  language: { type: String, default: 'en' },
  current_category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  is_bot_disabled: { type: Boolean, default: false }, // Disconnect AI Bot Toggle Switch
  
  // 🌟 FIXED: Schema field definition for tracking conversational context history
  history: [{ type: String, default: [] }], 

  // 🌟 FIXED: Schema field definition for tracking live console messages over the past rolling week
  chat_logs: [{
    sender: { type: String, enum: ['customer', 'bot', 'admin'] },
    text: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  timestamp: { type: Date, default: Date.now }
});

// Automatically purges customer transaction data elements from MongoDB after 10 days
sessionSchema.index({ timestamp: 1 }, { expireAfterSeconds: 864000 });

export default mongoose.model('Session', sessionSchema);
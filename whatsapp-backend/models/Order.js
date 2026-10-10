import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  phone_number: { type: String, required: true },
  status: { type: String, required: true },
  shipping_address: { type: String, default: '' }, // 🌟 ADDED: Captures customer address fields
  timestamp: { type: Date, default: Date.now }
});

// 🌟 CRITICAL: Tells MongoDB to clear the record automatically 10 days (864,000 seconds) after creation
orderSchema.index({ timestamp: 1 }, { expireAfterSeconds: 864000 });

export default mongoose.model('Order', orderSchema);
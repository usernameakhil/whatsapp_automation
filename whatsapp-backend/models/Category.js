import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  display_order: { type: Number, default: 0 },
  category_image_url: { type: String, default: '' }
});

export default mongoose.model('Category', categorySchema);
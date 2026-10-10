import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  images: [{ type: String }],
  description: { type: String },
  priority_order: { type: Number, default: 1 }
});

export default mongoose.model('Product', productSchema);
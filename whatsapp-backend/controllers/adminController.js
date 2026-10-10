import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Settings from '../models/Settings.js';

// --- CRM LEAD ENTRIES ---
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ timestamp: -1 });
    return res.status(200).json(orders);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// --- PRIMARY CATEGORIES ---
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ display_order: 1 });
    return res.status(200).json(categories);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { _id, name, display_order, category_image_url } = req.body;

    // 🌟 UPSERT CHECK: If an _id exists, update the record instead of making a duplicate
    if (_id) {
      const updatedCategory = await Category.findByIdAndUpdate(
        _id,
        { name, display_order, category_image_url },
        { new: true, runValidators: true }
      );
      return res.status(200).json(updatedCategory);
    }

    // Otherwise, register it as a brand-new sector placement
    const newCategory = new Category({ name, display_order, category_image_url });
    await newCategory.save();
    return res.status(201).json(newCategory);
  } catch (err) {
    console.error("❌ Backend processing failure on category mutation:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// --- NESTED PRODUCT VARIATIONS ---
export const getAllProducts = async (req, res) => {
  try {
    // 🌟 FIXED: Added .sort({ priority_order: 1 }) to deliver products sequentially to your React frontend
    const products = await Product.find({}).populate('category_id').sort({ priority_order: 1 });
    return res.status(200).json(products);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { _id, category_id, name, price, description, priority_order, images } = req.body;

    // 🌟 UPSERT CHECK: Handle product modifications if editing capabilities are used
    if (_id) {
      const updatedProduct = await Product.findByIdAndUpdate(
        _id,
        { category_id, name, price, description, priority_order, images },
        { new: true, runValidators: true }
      );
      return res.status(200).json(updatedProduct);
    }

    // Creating a brand-new product with explicit priority_order handling mapping parameters
    const newProduct = new Product({ category_id, name, price, description, priority_order, images });
    await newProduct.save();
    return res.status(201).json(newProduct);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// --- MASTER PAYMENT QR CONFIGURATION ---
export const getSettings = async (req, res) => {
  try {
    const settings = await Settings.findById('global_settings') || 
                     await Settings.create({ _id: 'global_settings', qr_code_url: '' });
    return res.status(200).json(settings);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const settings = await Settings.findByIdAndUpdate(
      'global_settings', 
      { qr_code_url: req.body.qr_code_url }, 
      { upsert: true, returnDocument: 'after' }
    );
    return res.status(200).json(settings);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
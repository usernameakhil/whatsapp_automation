import express from 'express';
import { 
  getAllOrders, 
  getAllCategories, createCategory, deleteCategory,
  getAllProducts, createProduct, deleteProduct,
  getSettings, updateSettings 
} from '../controllers/adminController.js';
import Session from '../models/Session.js';
import axios from 'axios';

const router = express.Router();

// --- CRM LEAD RETENTION LEDGERS ---
router.get('/orders', getAllOrders);

// --- SECTOR CONFIGURATION CORE ---
router.get('/categories', getAllCategories);
router.post('/categories', createCategory);
router.delete('/categories/:id', deleteCategory);

// --- STOCK VARIATIONS CONFIGURATION ---
router.get('/products', getAllProducts);
router.post('/products', createProduct);
router.delete('/products/:id', deleteProduct);

// --- MASTER BANK QR Blueprints ---
router.get('/settings', getSettings);
router.post('/settings', updateSettings);

// 🌟 CONSOLIDATED: WALPAS TERMINAL ACTIVE SESSION ENDPOINTS
router.get('/chats', async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // Limits extraction context cleanly to interactions inside the past 7 days
    const chats = await Session.find({ timestamp: { $gte: oneWeekAgo } });
    return res.status(200).json(chats);
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

router.post('/chats/toggle-bot', async (req, res) => {
  try {
    const { phone, is_bot_disabled } = req.body;
    const session = await Session.findByIdAndUpdate(phone, { is_bot_disabled }, { new: true });
    return res.status(200).json(session);
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

router.post('/chats/manual-send', async (req, res) => {
  try {
    const { phone, message } = req.body;

    await axios.post(`https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`, {
      messaging_product: "whatsapp", recipient_type: "individual", to: phone, type: "text", text: { body: message }
    }, { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } });

    const updated = await Session.findByIdAndUpdate(phone, {
      $push: { chat_logs: { sender: 'admin', text: message, timestamp: new Date() } },
      $set: { timestamp: new Date() } 
    }, { new: true, upsert: true });

    return res.status(200).json(updated);
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

export default router;
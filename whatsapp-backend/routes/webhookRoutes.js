import express from 'express';
import { handleIncomingWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// Required by Meta Cloud network nodes to perform token handshake validations
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode && token === process.env.VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

router.post('/webhook', handleIncomingWebhook);

export default router; 
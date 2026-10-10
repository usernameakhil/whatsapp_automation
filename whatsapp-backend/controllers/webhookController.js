import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Session from '../models/Session.js';
import Order from '../models/Order.js';
import Settings from '../models/Settings.js';

// Helper utility to pause execution thread to enforce anti-ban velocity rules
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- 🌟 INTERNAL CONSOLE LOG RETENTION INTERCEPTOR ---
const logChatToDatabase = async (phone, sender, text) => {
  try {
    const newMessage = { sender, text, timestamp: new Date() };

    // Atomically pushes to logs and updates TTL window using recommended Mongoose parameters
    const updatedSession = await Session.findByIdAndUpdate(
      phone,
      {
        $push: { chat_logs: newMessage },
        $set: { timestamp: new Date() }
      },
      { returnDocument: 'after' }
    );

    // Safe fallback if document was removed or missing mid-flight
    if (!updatedSession) {
      const freshSession = new Session({
        _id: phone,
        state: 'START',
        language: 'en',
        is_bot_disabled: false,
        chat_logs: [newMessage],
        history: [], 
        timestamp: new Date()
      });
      await freshSession.save();
    }
  } catch (err) {
    console.error("❌ CONSOLE CHAT LOG OPERATION FAULT:", err.message);
  }
};

// --- 🌟 FIXED: FORCES SAFE, IMMUTABLE HISTORIES AND STARTS SYSTEM RUNTIMES ---
const forceResetToStart = async (phone) => {
  await Session.findByIdAndDelete(phone);
  const newSession = new Session({ 
    _id: phone, 
    state: 'START', 
    language: 'en',
    is_bot_disabled: false,
    history: [], 
    chat_logs: [] 
  });
  await newSession.save();
  
  await sendWhatsAppButtons(phone, "Welcome! Please choose your language:\n\nకొనసాగించడానికి దయచేసి మీ భాషను ఎంచుకోండి:", ["English", "తెలుగు"]);
  return newSession;
};

// --- WHATSAPP API COMPONENT HELPERS WITH DB RETENTION & ANTI-BAN COOLING ---
const sendWhatsAppText = async (to, text) => {
  try {
    await axios.post(`https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`, {
      messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { body: text }
    }, { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } });
    
    // Save to Live Admin Terminal logs
    await logChatToDatabase(to, 'bot', text);
    
    // 🌟 ANTI-BAN MEASURE: Enforces a 1.2-second cooling gap right after sending a text string
    await sleep(1200);
  } catch (err) { console.error("❌ TEXT DISPATCH TRACE FAIL:", err.response?.data || err.message); }
};

const sendWhatsAppButtons = async (to, text, buttons) => {
  try {
    const formattedButtons = buttons.map((btn, idx) => ({ 
      type: "reply", 
      reply: { id: `btn_${idx}_${Date.now()}`, title: btn.slice(0, 20).trim() } 
    }));
    await axios.post(`https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`, {
      messaging_product: "whatsapp", recipient_type: "individual", to, type: "interactive",
      interactive: { type: "button", body: { text }, action: { buttons: formattedButtons } }
    }, { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } });

    // Save to Live Admin Terminal logs
    await logChatToDatabase(to, 'bot', `${text} [Buttons Offered: ${buttons.join(', ')}]`);
    
    // 🌟 ANTI-BAN MEASURE: Enforces a 1.5-second cooling gap after interactive menu frames layout
    await sleep(1500);
  } catch (err) { console.error("❌ BUTTONS DISPATCH TRACE FAIL:", err.response?.data || err.message); }
};

// 🌟 NEW WHATSAPP COMPONENT HELPER: Sends an Interactive Dropdown List Menu supporting up to 10 Rows
const sendWhatsAppList = async (to, text, buttonText, sectionsTitle, rows) => {
  try {
    const formattedRows = rows.slice(0, 10).map((row, idx) => ({
      id: `row_${idx}_${Date.now()}`,
      title: row.slice(0, 24).trim()
    }));

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text },
        action: {
          button: buttonText.slice(0, 20),
          sections: [
            {
              title: sectionsTitle.slice(0, 20),
              rows: formattedRows
            }
          ]
        }
      }
    };

    await axios.post(`https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`, payload, {
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" }
    });

    await logChatToDatabase(to, 'bot', `${text} [List Offered: ${rows.join(', ')}]`);
    await sleep(1500);
  } catch (err) { console.error("❌ LIST DISPATCH TRACE FAIL:", err.response?.data || err.message); }
};

const sendWhatsAppImage = async (to, imageUrl, caption) => {
  try {
    console.log(`📡 Shipping public media out to Meta engine pipeline: ${imageUrl}`);
    const payload = {
      messaging_product: "whatsapp", recipient_type: "individual", to, type: "image",
      image: { link: imageUrl, caption: caption }
    };
    await axios.post(`https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`, payload, {
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" }
    });

    // Save to Live Admin Terminal logs
    await logChatToDatabase(to, 'bot', `[Sent Image Media] ${caption}`);
    
    // 🌟 ANTI-BAN MEASURE: Enforces a longer 2.2-second cooling gap after large file deliveries
    await sleep(2200);
  } catch (err) { console.error("❌ META MEDIA TRANSMISSION ERROR:", err.response?.data || err.message); }
};

const downloadWhatsAppMedia = async (mediaId) => {
  const headers = { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` };
  const res = await axios.get(`https://graph.facebook.com/v18.0/${mediaId}`, { headers });
  const mediaRes = await axios.get(res.data.url, { headers, responseType: 'arraybuffer' });
  return Buffer.from(mediaRes.data);
};

// 🌟 RELIABLE MANUALLY UPLOADED SHOWCASE DISPATCHER
const renderProductsCatalog = async (phone, matchedCategory, language) => {
  const variants = await Product.find({ category_id: matchedCategory._id }).sort({ priority_order: 1 });
  
  if (variants.length === 0) {
    const emptyMsg = language === 'en' ? "No items available in this category right now." : "ఈ కేటగిరీలో ప్రస్తుతం ఏ వస్తువులూ లేవు.";
    return await sendWhatsAppText(phone, emptyMsg);
  }

  let catalogTextSummary = language === 'en'
    ? `📋 *${matchedCategory.name.toUpperCase()} CATALOG SELECTIONS* \n\n👉 *Please select the model number from above image (e.g., 1, 2) or type its price/name to choose!*`
    : `📋 *${matchedCategory.name} కేటలాగ్ ఎంపికలు* \n\n👉 *దయచేసి పై ఫోటో చూసి, మీకు కావలసిన వస్తువు నంబర్ (e.g., 1, 2) టైప్ చేయండి లేదా దాని ధర/పేరు పంపండి!*`;

  let manualShowcaseImage = matchedCategory.category_image_url;

  // 🌟 CLOUDINARY JPEG CONVERSION TRANSFORM INTERCEPTOR
  if (manualShowcaseImage && manualShowcaseImage.includes('cloudinary.com')) {
    manualShowcaseImage = manualShowcaseImage.replace('/upload/', '/upload/f_jpg,q_auto/');
  }

  if (manualShowcaseImage) {
    return await sendWhatsAppImage(phone, manualShowcaseImage, catalogTextSummary);
  } else {
    let fallbackText = `📋 *${matchedCategory.name.toUpperCase()} CATALOG* \n\n`;
    variants.forEach(v => { fallbackText += `*#${v.priority_order}* - ${v.name} (₹${v.price})\n`; });
    fallbackText += language === 'en' ? `\nReply with a number to buy!` : `\nకొనడానికి నంబర్ పంపండి!`;
    return await sendWhatsAppText(phone, fallbackText);
  }
  // 🌟 REMOVED: Home Menu buttons option here to allow user pure focus on choice entry numbers
};

// --- CORE WEBHOOK ENTRY ROUTE HANDLER ---
export const handleIncomingWebhook = async (req, res) => {
  if (!res.headersSent) {
    res.sendStatus(200);
  }
  
  try {
    const body = req.body;
    if (!body || !body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) return;

    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ CRITICAL ERROR: GEMINI_API_KEY missing from setup environment configuration!");
      return;
    }
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const msg = body.entry[0].changes[0].value.messages[0];
    const phone = msg.from;

    let session = await Session.findById(phone);
    if (!session) {
      session = await forceResetToStart(phone);
    }

    let userInput = "";
    if (msg.type === 'text') userInput = msg.text.body.trim();
    else if (msg.type === 'interactive' && msg.interactive?.button_reply) userInput = msg.interactive.button_reply.title.trim();
    else if (msg.type === 'interactive' && msg.interactive?.list_reply) userInput = msg.interactive.list_reply.title.trim(); // Captures Dropdown selections cleanly

    let quotedContextText = "";
    if (msg.context?.text) {
      quotedContextText = ` [User Quoted This Product Info: "${msg.context.text}"]`;
    }

    // Log customer inbound input streams right into database arrays instantly
    if (userInput) {
      await logChatToDatabase(phone, 'customer', userInput);
    }

    // INTERCEPT ROUTE BLOCK - IF MANUAL TAKEOVER IS ON, PAUSE AUTOMATED ACTIONS
    if (session.is_bot_disabled) {
      console.log(`🛡️ Human agent override active for customer room: +${phone}. AI responses paused.`);
      return;
    }

    const cleanInputLower = userInput.toLowerCase();

    // GLOBAL INTERRUPT FILTERS
    const greetingTriggers = ['hi', 'hello', 'hey', 'start', 'menu', 'options', 'హలో'];
    const resetTriggers = ['back to start', 'మళ్లీ మొదలు', 'shop more', 'ఇంకా కొనండి', 'home', 'హోమ్', 'back to shopping'];
    
    const shouldReset = resetTriggers.some(t => cleanInputLower.includes(t)) || 
                        (session.state !== 'SECTOR_SELECTED' && greetingTriggers.some(t => cleanInputLower === t));

    if (shouldReset) {
      session = await forceResetToStart(phone);
      return;
    }

    // --- STATE 1: INITIAL LANGUAGE SELECTION ROUTE ---
    if (session.state === 'START') {
      if (msg.type === 'interactive' && msg.interactive?.button_reply) {
        const isEnglish = userInput.includes('English');
        session.language = isEnglish ? 'en' : 'te';
        session.state = 'LANG_SELECTED';
        session.history = []; 
        await session.save();

        const locationMessage = isEnglish
          ? "📍 *Our Store Location Details:*\nChilakaluripet, Andhra Pradesh, India.\n\n🌐 *Find us live on Google Maps here:* https://maps.app.goo.gl/UQdgMDsWrq4znwQGA"
          : "📍 *మా స్టోర్ చిరునామా వివరాలు:*\nచిలకలూరిపేట, ఆంధ్రప్రదేశ్, భారతదేశం.\n\n🌐 *మ్యాప్స్ లింక్ ద్వారా మమ్మల్ని ఇక్కడ కనుగొనండి:* https://maps.app.goo.gl/UQdgMDsWrq4znwQGA";
        
        await sendWhatsAppText(phone, locationMessage);

        const activeCategories = await Category.find({}).sort({ display_order: 1 });
        if (activeCategories.length === 0) {
          return await sendWhatsAppText(phone, session.language === 'en' ? "Our catalog is undergoing maintenance." : "మా కేటలాగ్ ప్రస్తుతం అందుబాటులో లేదు.");
        }

        // Extracts all categories from database (up to 10) instead of slicing off at 3
        const categoryNamesList = activeCategories.map(c => c.name).slice(0, 10);
        
        const menuHeading = isEnglish
          ? "Please select a catalog category folder from the options below:" 
          : "దయచేసి క్రింది ఆప్షన్ల నుండి ఒక కేటలాగ్‌ను ఎంచుకోండి:";

        const selectLabel = isEnglish ? "View Categories" : "కేటలాగ్ చూడండి";
        const sectionHeader = isEnglish ? "Our Store Catalogs" : "మా కేటలాగ్స్";
        
        return await sendWhatsAppList(phone, menuHeading, selectLabel, sectionHeader, categoryNamesList);
      }
      session = await forceResetToStart(phone);
      return;
    }

    // --- STATE 2: SECTOR CATEGORY RENDERING ---
    if (session.state === 'LANG_SELECTED') {
      const matchedCategory = await Category.findOne({ name: { $regex: new RegExp(`^${userInput}$`, 'i') } });
      
      if (matchedCategory) {
        session.current_category_id = matchedCategory._id;
        session.state = 'SECTOR_SELECTED';
        await session.save();

        return await renderProductsCatalog(phone, matchedCategory, session.language);
      }
      session = await forceResetToStart(phone);
      return;
    }

    // --- STATE 3: MULTIMODAL SERIAL-MAP MATCHING DECK ---
    if (session.state === 'SECTOR_SELECTED') {
      const isOnlinePayment = cleanInputLower.includes('online payment') || cleanInputLower.includes('ఆన్‌లైన్ పేమెంట్');
      const isCodPayment = cleanInputLower.includes('cod purchase') || cleanInputLower.includes('cod పర్చేజ్') || cleanInputLower.includes('క్యాష్ ఆన్ డెలివరీ');

      if (isOnlinePayment) {
        session.state = 'CHECKOUT_PENDING';
        await session.save();
        const globalConfig = await Settings.findById('global_settings');
        let onlineQrUrl = globalConfig.qr_code_url;
        
        // CLOUDINARY JPEG CONVERSION TRANSFORM INTERCEPTOR
        if (onlineQrUrl && onlineQrUrl.includes('cloudinary.com')) {
          onlineQrUrl = onlineQrUrl.replace('/upload/', '/upload/f_jpg,q_auto/');
        }

        const onlineMsg = session.language === 'en'
          ? "PhonePe number :7416958315 Scan this QR code from any payment app to complete the transaction. for payement related issues, Customer Care : 9391958315 Once complete, please upload your payment screenshot here."
          : "PhonePe number :7416958315 ఏదైనా పేమెంట్ యాప్ ద్వారా ఈ QR కోడ్‌ని స్కాన్ చేసి పేమెంట్ చేయండి. పేమెంట్‌కు సంబంధించిన సమస్యలు ఉంటే Customer Care : 9391958315 పూర్తయిన తర్వాత, ఆ రశీదు స్క్రీన్‌షాట్‌ను ఇక్కడ పంపండి.";
        return await sendWhatsAppImage(phone, onlineQrUrl, onlineMsg);
      }

      if (isCodPayment) {
        session.state = 'ADVANCE_PENDING';
        await session.save();
        const globalConfig = await Settings.findById('global_settings');
        let codQrUrl = globalConfig.qr_code_url;
        
        // CLOUDINARY JPEG CONVERSION TRANSFORM INTERCEPTOR
        if (codQrUrl && codQrUrl.includes('cloudinary.com')) {
          codQrUrl = codQrUrl.replace('/upload/', '/upload/f_jpg,q_auto/');
        }

        const codMsg = session.language === 'en'
          ? "PhonePe number :7416958315 For Cash on Delivery, a  ₹500 security advance is required. Scan this QR code to deposit the advance, for payement related issues, Customer Care : 9391958315 then upload your receipt screenshot here."
          : "PhonePe number :7416958315 క్యాష్ ఆన్ డెలివరీ (COD) కోసం, మీరు ఖచ్చితంగా ₹500 అడ్వాన్స్ పేమెంట్ చేయాలి. పేమెంట్‌కు సంబంధించిన సమస్యలు ఉంటే Customer Care :9391958315 ఈ QR కోడ్ స్కాన్ చేసి అడ్వాన్స్ పంపి, ఆ స్క్రీన్‌షాట్‌ను ఇక్కడ పంపండి.";
        return await sendWhatsAppImage(phone, codQrUrl, codMsg);
      }

      const directCategoryMatch = await Category.findOne({ name: { $regex: new RegExp(`^${userInput}$`, 'i') } });
      if (directCategoryMatch) {
        session.current_category_id = directCategoryMatch._id;
        await session.save();
        return await renderProductsCatalog(phone, directCategoryMatch, session.language);
      }

      const availableInventoryContext = await Product.find({ category_id: session.current_category_id }).sort({ priority_order: 1 });

      // FLOW A: CUSTOMER RESPONDS WITH SERIAL NUMBER OR TEXT CLUES
      if (msg.type === 'text') {
        const numericChoice = parseInt(userInput);
        const matchedItemByPriority = availableInventoryContext.find(
          p => Number(p.priority_order) === numericChoice
        );

        if (matchedItemByPriority) {
          const itemCaption = session.language === 'en'
            ? `📦 Item Selected: ${matchedItemByPriority.name}\n💰 Fixed Price: ₹${matchedItemByPriority.price}\n📝 Specifications: ${matchedItemByPriority.description || 'N/A'}`
            : `📦 ఎంచుకున్న వస్తువు: ${matchedItemByPriority.name}\n💰 ఖచ్చితమైన ధర: ₹${matchedItemByPriority.price}\n📝 వివరాలు: ${matchedItemByPriority.description || 'N/A'}`;

          if (matchedItemByPriority.images?.length > 0) {
            let pImageUrl = matchedItemByPriority.images[0];
            // CLOUDINARY JPEG CONVERSION TRANSFORM INTERCEPTOR
            if (pImageUrl && pImageUrl.includes('cloudinary.com')) {
              pImageUrl = pImageUrl.replace('/upload/', '/upload/f_jpg,q_auto/');
            }
            await sendWhatsAppImage(phone, pImageUrl, itemCaption);
          } else {
            await sendWhatsAppText(phone, itemCaption);
          }

          // 🌟 MODIFIED: Enforces dynamic payment threshold buttons for direct serial number entries
          let actionButtons = [];
          if (matchedItemByPriority.price < 1500) {
            actionButtons = session.language === 'en' ? ["💳 Online Payment", "🏠 Home Menu"] : ["💳 ఆన్‌లైన్ పేమెంట్", "🏠 హోమ్ మెనూ"];
          } else {
            actionButtons = session.language === 'en' ? ["💳 Online Payment", "📦 COD Purchase", "🏠 Home Menu"] : ["💳 ఆన్‌లైన్ పేమెంట్", "📦 COD పర్చేజ్", "🏠 హోమ్ మెనూ"];
          }
          return await sendWhatsAppButtons(phone, session.language === 'en' ? "Please select a payment method action below to checkout:" : "కొనసాగించడానికి దయచేసి ఒక ఆప్షన్ ఎంచుకోండి:", actionButtons);
        }
      }

      // FLOW B: MULTIMODAL INTEGRATION WITH CAPACITY PROTECTION
      if (msg.type === 'image') {
        let customerImageBuffer = null;
        try {
          customerImageBuffer = await downloadWhatsAppMedia(msg.image.id);
        } catch (mediaErr) {
          console.error("⚠️ WhatsApp media file fetch error:", mediaErr.message);
        }

        const multimodalAuditorPrompt = `You are an elite vision-scanning AI sales inspector.
        Here is the explicit array list of products matching the active category data context structure:
        ${JSON.stringify(availableInventoryContext)}

        DIRECTIONS:
        1. Compare the customer's uploaded image against the catalog items. Does it display an identical or clear match to any item name, description, or feature in our list?
        2. If a definite match is identified, return a clean JSON string matching this signature strictly:
           {"found": true, "matched_product_id": "MONGO_ID_OF_PRODUCT"}
        3. If no match is found, or if the uploaded image is an unrelated file, return exactly:
           {"found": false, "matched_product_id": null}`;

        let visionResultMap = { found: false, matched_product_id: null };
        let visionSuccess = false;

        if (customerImageBuffer) {
          try {
            const geminiVisionResponse = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: [
                multimodalAuditorPrompt,
                { inlineData: { data: customerImageBuffer.toString('base64'), mimeType: 'image/jpeg' } }
              ]
            });

            visionResultMap = JSON.parse(geminiVisionResponse.text.trim());
            visionSuccess = true;
          } catch (visionError) {
            console.warn("⚠️ Vision engine overload, dropping cleanly to conversational filters:", visionError.message);
            visionSuccess = false;
          }
        }

        if (visionSuccess && visionResultMap.found && visionResultMap.matched_product_id) {
          const visualMatchItem = await Product.findById(visionResultMap.matched_product_id);
          if (visualMatchItem) {
            const itemCaption = session.language === 'en'
              ? `🎯 Visual Match Detected: ${visualMatchItem.name}\n💰 Fixed Price: ₹${visualMatchItem.price}\n📝 Description: ${visualMatchItem.description || 'N/A'}`
              : `🎯 వస్తువు మ్యాచ్ వెరిఫై అయింది: ${visualMatchItem.name}\n💰 ఖచ్చితమైన ధర: ₹${visualMatchItem.price}\n📝 వివరాలు: ${visualMatchItem.description || 'న్/ఎ'}`;

            if (visualMatchItem.images?.length > 0) {
              let vImageUrl = visualMatchItem.images[0];
              // CLOUDINARY JPEG CONVERSION TRANSFORM INTERCEPTOR
              if (vImageUrl && vImageUrl.includes('cloudinary.com')) {
                vImageUrl = vImageUrl.replace('/upload/', '/upload/f_jpg,q_auto/');
              }
              await sendWhatsAppImage(phone, vImageUrl, itemCaption);
            } else {
              await sendWhatsAppText(phone, itemCaption);
            }

            // 🌟 MODIFIED: Enforces dynamic payment threshold buttons for picture/multimodal scanner lanes
            let actionButtons = [];
            if (visualMatchItem.price < 1500) {
              actionButtons = session.language === 'en' ? ["💳 Online Payment", "🏠 Home Menu"] : ["💳 ఆన్‌లైన్ పేమెంట్", "🏠 హోమ్ మెనూ"];
            } else {
              actionButtons = session.language === 'en' ? ["💳 Online Payment", "📦 COD Purchase", "🏠 Home Menu"] : ["💳 ఆన్‌లైన్ పేమెంట్", "📦 COD పర్చేజ్", "🏠 హోమ్ మెనూ"];
            }
            return await sendWhatsAppButtons(phone, session.language === 'en' ? "Please choose your preferred checkout method below:" : "కొనసాగించడానికి దయచేసి ఒక ఆప్షన్ ఎంచుకోండి:", actionButtons);
          }
        }

        const ticketLeadRecord = new Order({ phone_number: phone, status: 'FALLBACK_SUPPORT_TICKET_OPENED' });
        await ticketLeadRecord.save();

        session.state = 'START'; 
        session.history = [];
        await session.save();

        const agentNoticeText = session.language === 'en'
          ? "⚠️ We couldn't find an exact match for this image in our current category. Don't worry! Our sales agent will call you shortly to assist you manually.\n\nTap below to open the Main Menu:"
          : "⚠️ క్షమించండి, ఈ ఫోటోకు సరిపోయే వస్తువు మా స్టాక్‌లో లభించలేదు. మా ఏజెంట్ த్వరలోనే మీకు ఫోన్ చేసి ఆర్డర్ తీసుకుంటారు.\n\nప్రధాన మెనూకు తిరిగి వెళ్ళడానికి క్రింది బటన్ నొక్కండి:";

        const fallbackMenuButtons = session.language === 'en' ? ["🛍️ Shop More"] : ["ఇంకా కొనండి 🛍️"];
        return await sendWhatsAppButtons(phone, agentNoticeText, fallbackMenuButtons);
      }

      // Standard textual assistant path if user describes an item instead of passing a pure index number
      const currentLanguageContextString = session.language === 'en' ? "English" : "Telugu";
      
      const coreSalesSystemPrompt = `You are an elite automated storefront assistant.
      Active products list available context: ${JSON.stringify(availableInventoryContext)}
      User Message: "${userInput}"

      DIRECTIVES:
      1. CRITICAL: If the user asks for a photo, image, picture, or refers to an item by its serial number/name (e.g., "2", "photo of 2"), you MUST find that product in the context and return its exact MongoDB "_id" field in the "matched_product_id" JSON parameter.
      2. NEVER put a raw image URL string or Cloudinary link into the "reply_text" field. Keep "reply_text" strictly conversational.
      3. If the user bargains, firmly state in exactly 1 brief sentence that prices are strictly fixed.
      4. Return a clean JSON string matching this signature strictly:
         {"matched_product_id": "MONGO_ID_OR_NULL", "reply_text": "Your response text goes here in ${currentLanguageContextString}."}`;

      const trimmedHistory = session.history ? session.history.slice(-4) : [];
      let parsedPayload = { matched_product_id: null, reply_text: "" };

      try {
        const aiResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [...trimmedHistory, userInput + quotedContextText],
          config: { systemInstruction: coreSalesSystemPrompt, responseMimeType: "application/json" }
        });
        parsedPayload = JSON.parse(aiResponse.text);
      } catch (err) {
        parsedPayload = {
          matched_product_id: null,
          reply_text: session.language === 'en'
            ? "All pricing profiles are strictly fixed. Please select a checkout route options action below:"
            : "మా ధరలు అన్నీ ఖచ్చితంగా ఫిక్స్డ్. కొనసాగించడానికి దయచేసి క్రింది బటన్ నొక్కండి:"
        };
      }

      if (parsedPayload.matched_product_id) {
        const exactItem = await Product.findById(parsedPayload.matched_product_id);
        if (exactItem) {
          const itemCaption = session.language === 'en'
            ? `📦 Target Match: ${exactItem.name}\n💰 Fixed Price: ₹${exactItem.price}\n📝 Specifications: ${exactItem.description || 'N/A'}`
            : `📦 ఎంచుకున్న వస్తువు: ${exactItem.name}\n💰 ఖచ్చితమైన ధర: ₹${exactItem.price}\n📝 వివరాలు: ${exactItem.description || 'న/ఎ'}`;
          
          if (exactItem.images?.length > 0) {
            let targetMatchUrl = exactItem.images[0];
            // CLOUDINARY JPEG CONVERSION TRANSFORM INTERCEPTOR
            if (targetMatchUrl && targetMatchUrl.includes('cloudinary.com')) {
              targetMatchUrl = targetMatchUrl.replace('/upload/', '/upload/f_jpg,q_auto/');
            }
            await sendWhatsAppImage(phone, targetMatchUrl, itemCaption);
          } else {
            await sendWhatsAppText(phone, itemCaption);
          }
          
          if (!session.history) session.history = [];
          session.history.push(userInput, `[Visual Card Sent: ${exactItem.name}]`);
          await session.save();

          // 🌟 MODIFIED: Enforces dynamic payment threshold buttons for conversational text assistant targets
          let actionButtons = [];
          if (exactItem.price < 1500) {
            actionButtons = session.language === 'en' ? ["💳 Online Payment", "🏠 Home Menu"] : ["💳 ఆన్‌లైన్ పేమెంట్", "🏠 హోమ్ మెనూ"];
          } else {
            actionButtons = session.language === 'en' ? ["💳 Online Payment", "📦 COD Purchase", "🏠 Home Menu"] : ["💳 ఆన్‌లైన్ పేమెంట్", "📦 COD పర్చేజ్", "🏠 హోమ్ మెనూ"];
          }
          return await sendWhatsAppButtons(phone, session.language === 'en' ? "Please choose an action option below:" : "కొనసాగించడానికి దయచేసి ఒక ఆప్షన్ ఎంచుకోండి:", actionButtons);
        }
      } else if (parsedPayload.reply_text) {
        if (!session.history) session.history = [];
        session.history.push(userInput, parsedPayload.reply_text);
        await session.save();
        await sendWhatsAppText(phone, parsedPayload.reply_text);

        // Standard actions display if no specific product was matched by the AI conversational lane
        const actionButtons = session.language === 'en' ? ["💳 Online Payment", "📦 COD Purchase", "🏠 Home Menu"] : ["💳 ఆన్‌లైన్ పేమెంట్", "📦 COD పర్చేజ్", "🏠 హోమ్ మెనూ"];
        return await sendWhatsAppButtons(phone, session.language === 'en' ? "Please choose an action option below:" : "కొనసాగించడానికి దయచేసి ఒక ఆప్షన్ ఎంచుకోండి:", actionButtons);
      }
    }

    // --- STATE 4 & 5: CHECKOUT VERIFICATION ---
    if (session.state === 'CHECKOUT_PENDING' || session.state === 'ADVANCE_PENDING') {
      if (msg.type === 'image') {
        const imageBuffer = await downloadWhatsAppMedia(msg.image.id);

        const auditVisionResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            'Is this a mobile bank snapshot image showing a successful payment transfer confirmation receipt? Reply strictly "true" or "false".',
            { inlineData: { data: imageBuffer.toString('base64'), mimeType: 'image/jpeg' } }
          ]
        });

        if (auditVisionResponse.text.trim().toLowerCase().includes('true')) {
  const confirmedLead = new Order({
    phone_number: phone,
    status: session.state === 'CHECKOUT_PENDING'
      ? 'CONFIRMED_ONLINE'
      : 'CONFIRMED_COD_ADVANCE'
  });

  await confirmedLead.save();

  session.state = 'ADDRESS_PENDING';
  await session.save();

  return await sendWhatsAppText(
    phone,
    session.language === 'en'
      ? `🎉 Payment verified successfully!

Please provide your complete delivery details below to complete shipment routing:

Name:
House/Flat No.:
Street/Area:
City:
State:
PIN Code:
Phone Number:

Please ensure all details are correct to avoid delivery delays.`
      : `🎉 మీ పేమెంట్ విజయవంతంగా వెరిఫై అయింది!

డెలివరీ ప్రక్రియను పూర్తి చేయడానికి దయచేసి మీ పూర్తి చిరునామా వివరాలను క్రింద నమోదు చేయండి:

పేరు:
ఇంటి/ఫ్లాట్ నంబర్:
వీధి/ప్రాంతం:
నగరం:
రాష్ట్రం:
పిన్ కోడ్:
ఫోన్ నంబర్:

డెలివరీలో ఆలస్యం కాకుండా అన్ని వివరాలను సరిగ్గా నమోదు చేయండి.`
  );
}

        return await sendWhatsAppText(phone, session.language === 'en' 
          ? "Verification failed. Please send a valid payment transaction receipt snapshot." 
          : "వెరిఫికేషన్ విఫలమైంది. దయచేసి సరైన స్క్రీన్‌షాట్‌ను మళ్లీ పంపండి.");
      }

      const uploadReminderText = session.language === 'en' ? "Please upload the payment transaction screenshot document." : "ఆర్డర్ పూర్తి చేయడానికి దయచేసి మీ పేమెంట్ రశీదు స్క్రీన్‌షాట్‌ను పంపండి.";
      return await sendWhatsAppButtons(phone, uploadReminderText, session.language === 'en' ? ["🏠 Home Menu"] : ["🏠 హోమ్ మెనూ"]);
    }

    // --- STATE 6: DELIVERY ADDRESS WRITING ---
    if (session.state === 'ADDRESS_PENDING') {
      if (msg.type === 'text') {
        // UPDATES THE SHIPPING ADDRESS ON THE USER'S LATEST OPEN ORDER RECORD
        await Order.findOneAndUpdate(
          { phone_number: phone, shipping_address: '' },
          { shipping_address: userInput },
          { sort: { timestamp: -1 } }
        );
      }

      session.state = 'START';
      session.history = [];
      await session.save();

      return await sendWhatsAppButtons(phone, session.language === 'en'
        ? "Thank you! Your delivery details have been locked into our system logs. Our shipping team will contact you shortly.\n\nTap below to explore more products!"
        : "ధన్యవాదాలు! మీ చిరునామా వివరాలు మా సిస్టమ్‌లో సేవ్ చేయబడ్డాయి. మా టీమ్ త్వరలోనే మిమ్మల్ని సంప్రదిస్తారు.\n\nఇతర వస్తువులను చూడాలనుకుంటే క్రింది బటన్ నొక్కండి!", 
        session.language === 'en' ? ["🛍️ Shop More"] : ["ఇంకా కొనండి 🛍️"]
      );
    }

    session = await forceResetToStart(phone);
    return;

  } catch (error) {
    console.error("❌ CRITICAL WEBHOOK TRANSIT CRASH:", error.message);
  }
};
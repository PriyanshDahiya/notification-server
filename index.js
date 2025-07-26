const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();

// ✅ Allow only specific frontend origin (e.g., your Expo dev client)
const corsOptions = {
  origin: 'http://localhost:19007',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// ✅ Initialize Firebase Admin
// This correctly uses the environment variable you already have set up on Render.
const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ✅ Health check
app.get('/health', (req, res) => {
  res.status(200).send('Server is healthy');
});

// ✨ Rich Link Preview & Redirect Endpoint
app.get('/api/redirect', async (req, res) => {
  const { id } = req.query; // Get deck ID from URL: /api/redirect?id=deck123

  if (!id) {
    return res.status(400).send('<h1>Error: Missing Deck ID</h1>');
  }

  try {
    // --- Fetch Deck and Product Data from Firebase ---
    const deckDoc = await db.collection('communityDecks').doc(id).get();
    if (!deckDoc.exists) {
      return res.status(404).send('<h1>Error: Deck not found</h1>');
    }
    const deckData = deckDoc.data();
    
    const userDoc = await db.collection('users').doc(deckData.userId).get();
    const username = userDoc.data()?.username || 'a user';
    
    const firstProductId = deckData.productIds[0];
    const productDoc = await db.collection('users').doc(deckData.userId).collection('wardrobe').doc(firstProductId).get();
    const imageUrl = productDoc.data()?.feature_image || 'https://www.suitsme.in/image/logo.png'; // Fallback to your logo

    const deckTitle = deckData.title || `An outfit deck by ${username}`;
    const description = 'Check out this awesome outfit deck on SuitsMe! ✨';
    
    // --- Dynamically Generate the Full HTML Page ---
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Opening Deck...</title>
          <meta property="og:title" content="${deckTitle}" />
          <meta property="og:description" content="${description}" />
          <meta property="og:image" content="${imageUrl}" />
          <meta http-equiv="refresh" content="0; url=suitsme://deck/${id}" />
        </head>
        <body>Redirecting...</body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);

  } catch (error) {
    console.error('Error fetching deck data:', error);
    return res.status(500).send('<h1>Error: Server failed to fetch deck data.</h1>');
  }
});

// ✅ Push Notification endpoint
app.post('/send-notification', async (req, res) => {
  const { token, title, body } = req.body;

  if (!token || !title || !body) {
    return res.status(400).send({ error: 'token, title, and body are required' });
  }

  const message = {
    to: token,
    sound: 'default',
    title,
    body,
    data: { customData: true },
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log("✅ Notification forwarded to Expo:", result);
    res.send({ success: true, result });
  } catch (err) {
    console.error("❌ Error sending notification:", err);
    res.status(500).send({ error: err.message });
  }
});

// ✅ Daily Curated Notification endpoint
app.post('/send-daily-curated', async (req, res) => {
  try {
    const usersRef = await admin.firestore().collection("users").get();
    const now = Date.now();

    const staleUsers = [];

    usersRef.forEach(docSnap => {
      const data = docSnap.data();
      const lastActive = data.lastActive ? new Date(data.lastActive).getTime() : 0;
      const timeSinceActive = now - lastActive;

      if (data.expoPushToken && timeSinceActive > 24 * 60 * 60 * 1000) {
        staleUsers.push({ token: data.expoPushToken });
      }
    });

    const notifications = staleUsers.map(({ token }) => ({
      to: token,
      title: "👗 Today’s Curated Picks!",
      body: "Fresh fashion finds await you. Come check them out!",
      sound: "default",
      data: { type: "daily-curated" },
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notifications),
    });

    const result = await response.json();
    console.log("✅ Daily curated notifications sent:", result);
    res.send({ success: true, sent: staleUsers.length });
  } catch (error) {
    console.error("❌ Error sending daily notifications:", error);
    res.status(500).send({ error: error.message });
  }
});


// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Notification & Redirect server is running on port ${PORT}`);
});

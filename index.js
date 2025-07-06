const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();

// ✅ Allow only specific frontend origin (Expo web client)
const corsOptions = {
  origin: 'http://localhost:19007',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// ✅ Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ✅ Health check
app.get('/health', (req, res) => {
  res.status(200).send('Notification server is healthy');
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
  console.log(`🚀 Notification server is running on port ${PORT}`);
});



const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const app = express();
app.use(bodyParser.json());

// ✅ Initialize Firebase Admin using env variable (secure)
const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ✅ Health check route
app.get('/health', (req, res) => {
  res.status(200).send('Notification server is healthy');
});

// ✅ Push Notification route
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


// ✅ Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Notification server is running on port ${PORT}`);
});

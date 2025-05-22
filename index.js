// ... existing requires and setup
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const app = express();

app.use(bodyParser.json());

// Firebase Admin Init
const serviceAccount = require('./suitsme-1b95b-firebase-adminsdk-fbsvc-9f3fb934dd.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ✅ Health check route
app.get('/health', (req, res) => {
  res.status(200).send('Notification server is healthy');
});

// ✅ Notification route
app.post('/send-notification', async (req, res) => {
  const { token, title, body } = req.body;

  const message = {
    token,
    notification: { title, body },
    android: { priority: "high" },
    apns: {
      payload: {
        aps: {
          alert: { title, body },
          sound: "default"
        }
      }
    },
    webpush: {
      notification: { title, body }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Notification sent:", response);
    res.send({ success: true, response });
  } catch (err) {
    console.error("Error sending notification:", err);
    res.status(500).send({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

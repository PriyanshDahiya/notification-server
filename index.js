const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const app = express();

app.use(bodyParser.json());

// Initialize Firebase Admin with service account
const serviceAccount = require('./suitsme-1b95b-firebase-adminsdk-fbsvc-9f3fb934dd.json'); // <-- path to your downloaded JSON

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.post('/send-notification', async (req, res) => {
  const { token, title, body } = req.body;

  const message = {
    token,
    notification: {
      title,
      body,
    },
    android: {
      priority: "high",
    },
  };

  try {
    const response = await admin.messaging().send(message);
    res.send({ success: true, response });
  } catch (err) {
    console.error("Error sending FCM notification:", err);
    res.status(500).send({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

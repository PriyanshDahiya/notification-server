const express = require('express');
const bodyParser = require('body-parser');
const { Expo } = require('expo-server-sdk');

const expo = new Expo();
const app = express();
app.use(bodyParser.json());

app.get('/health', (req, res) => {
  res.status(200).send({ status: 'ok', message: 'Server is healthy 🚀' });
});

app.post('/send-notification', async (req, res) => {
  console.log("Received /send-notification request with body:", req.body);

  const { token, title, body } = req.body;

  if (!Expo.isExpoPushToken(token)) {
    console.log("Invalid Expo push token:", token);
    return res.status(400).send({ error: 'Invalid Expo push token' });
  }

  try {
    const ticket = await expo.sendPushNotificationsAsync([{
      to: token,
      sound: 'default',
      title,
      body,
    }]);
    console.log("Push notification ticket:", ticket);
    res.send({ success: true, ticket });
  } catch (err) {
    console.error("Error sending notification:", err);
    res.status(500).send({ error: err.message });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

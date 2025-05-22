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
  const { token, title, body } = req.body;

  if (!Expo.isExpoPushToken(token)) {
    return res.status(400).send({ error: 'Invalid Expo push token' });
  }

  try {
    const ticket = await expo.sendPushNotificationsAsync([{
      to: token,
      sound: 'default',
      title,
      body,
    }]);

    res.send({ success: true, ticket });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

import { Router } from 'express';
import { User, Message } from './models';
import { validateUsername, validateGuid, validatePayload, validateCount, validateStart, escapeXSS } from './utils';

const router = Router();

// POST /api/v1/register
router.post('/register', (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    if (!validateUsername(username)) {
      res.status(400).json({ error: 'Invalid username' });
      return;
    }

    const guid = User.create(username);
    res.status(200).json({ guid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST /api/v1/messages/send
router.post('/messages/send', (req, res) => {
  try {
    const { sender, receiver, payload } = req.body;

    if (!sender || !receiver || payload === undefined) {
      res.status(400).json({ error: 'sender, receiver and payload are required' });
      return;
    }

    if (!sender) {
      res.status(400).json({ error: 'Invalid sender' });
      return;
    }

    if (!receiver) {
      res.status(400).json({ error: 'Invalid receiver' });
      return;
    }

    if (!validatePayload(payload)) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    // Check if users exist
    // const senderUser = User.findById(sender);
    // const receiverUser = User.findById(receiver);

    // if (!senderUser || !receiverUser) {
    //   res.status(404).json({ error: 'Sender or receiver not found' });
    //   return;
    // }

    const contentGuid = Message.send(sender, receiver, payload);
    Message.saveFile(contentGuid, payload);

    res.status(200).json({ message: 'Message sent successfully' });
  } catch (error) {
    res.status(500).json({ error: `Failed to send message. ${error?.toString()}` });
  }
});

// POST /api/v1/messages/get
router.post('/messages/get', (req, res) => {
  try {
    const { receiver, sender, start, count } = req.body;

    if (!receiver && !sender) {
      res.status(400).json({ error: 'At least receiver or sender is required' });
      return;
    }

    if (!validateStart(start)) {
      res.status(400).json({ error: 'Invalid start parameter' });
      return;
    }

    if (!validateCount(count)) {
      res.status(400).json({ error: 'Invalid count parameter' });
      return;
    }

    let messages;
    let total;

    if (sender && receiver) {
      messages = Message.findBySenderAndReceiver(sender, receiver, start, count);
      total = Message.countBySenderAndReceiver(sender, receiver);
    } else if (receiver) {
      messages = Message.findByReceiver(receiver, start, count);
      total = Message.countByReceiver(receiver);
    } else {
      messages = Message.findBySender(sender, start, count);
      total = Message.countBySender(sender);
    }

    console.log('Messages:', messages);

    const messagesWithPayload = messages.map((msg: any) => {
      const payload = Message.getFile(msg.content_guid);
      return {
        receiver: msg.receiver_id,
        sender: msg.sender_id,
        payload: escapeXSS(payload),
        createDate: msg.create_date,
      };
    });

    res.status(200).json({ total, messages: messagesWithPayload });
  } catch (error) {
    res.status(500).json({ error: `Failed to get messages. ${error?.toString()}` });
  }
});

// GET /api/version
router.get('/version', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const packagePath = path.join(__dirname, '../package.json');

    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    res.status(200).json({ version: packageJson.version });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get version' });
  }
});

export default router;
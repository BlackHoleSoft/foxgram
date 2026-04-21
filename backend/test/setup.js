const { db } = require('../src/db');

function setup() {
  // Clean up database before each test
  cleanup();
}

function cleanup() {
  // Delete all messages
  db.exec('DELETE FROM message');
  
  // Delete all users
  db.exec('DELETE FROM user');
  
  // Delete message files
  const fs = require('fs');
  const path = require('path');
  const messagesDir = path.join(__dirname, '../src/messages');
  
  if (fs.existsSync(messagesDir)) {
    const files = fs.readdirSync(messagesDir);
    files.forEach(file => {
      if (file.endsWith('.msg')) {
        fs.unlinkSync(path.join(messagesDir, file));
      }
    });
  }
}

module.exports = {
  setup,
  cleanup
};
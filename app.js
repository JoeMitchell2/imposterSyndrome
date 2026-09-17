const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Vital for your iPhone's browser to talk to the server
app.use(express.json()); // Allows the server to read the JSON data sent by the chat

// Database Configuration
// Use environment variables for security!
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'YOUR_USER',
  password: process.env.DB_PASSWORD || 'YOUR_PASSWORD',
  database: process.env.DB_NAME || 'your_database_name',
};

// Create a connection pool for stability
const pool = mysql.createPool(dbConfig);

/**
 * POST /save
 * Expects: { userId: "some_id", content: "the_chat_history" }
 * Logic: Upsert (Insert if new, Update if exists)
 */
app.post('/save', async (req, res) => {
  try {
    const { userId, content } = req.body;

    if (!userId || !content) {
      return res.status(400).json({ error: 'Missing userId or content' });
    }

    const sql = `
      INSERT INTO user_saves (userId, content, last_updated) 
      VALUES (?, ?, NOW()) 
      ON DUPLICATE KEY UPDATE content = ?, last_updated = NOW()
    `;

    await pool.execute(sql, [userId, content, content]);
    
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

/**
 * GET /load/:userId
 * Allows the frontend to recover data after a "Refresh of Doom"
 */
app.get('/load/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await pool.execute('SELECT content FROM user_saves WHERE userId = ?', [userId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No saved data found' });
    }
    
    res.json({ content: rows[0].content });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load data' });
  }
});

app.get('/', (req, res) => {
  res.send('is.cosmicengine.com: Auto-save server is active 🚀');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

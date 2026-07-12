const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

// Register User (Helper for setup)
router.post('/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Check if user exists
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    user = new User({
      username,
      password: hashedPassword,
      role: role || 'user'
    });

    await user.save();

    res.status(201).json({ message: 'User created successfully', user: { username: user.username, role: user.role } });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check for user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Create JWT Payload
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '1d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, role: user.role, username: user.username });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user (Optional helper)
router.get('/me', async (req, res) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
});

module.exports = router;

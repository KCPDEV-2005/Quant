require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();
const port = process.env.PORT || 5005;
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/school_head_matcher';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/test", (req, res) => {
  res.send("Backend is working!");
});
// Routes
app.use('/api', apiRoutes);
const statsRoutes = require('./routes/stats');
const comparisonRoutes = require('./routes/comparison');
const authRoutes = require('./routes/auth');

app.use('/api', statsRoutes);
app.use('/api', comparisonRoutes);
app.use('/api/auth', authRoutes);

// MongoDB connection
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB:', mongoURI);
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

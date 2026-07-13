require('dotenv').config();
const mongoose = require('mongoose');
const School = require('./models/School');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/school_head_matcher')
  .then(async () => {
    const school = await School.findOne({});
    console.log(school);
    mongoose.connection.close();
  });

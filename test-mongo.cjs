// name=test-mongo.js
const mongoose = require('mongoose');
const uri = process.env.MONGO_URI || 'mongodb://DB_USER:DB_PASS@DB_HOST:DB_PORT/DB_NAME?authSource=admin';
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => { console.log('CONNECTED'); process.exit(0); })
  .catch(err => { console.error('CONNECT_ERR', err); process.exit(1); });

require('dotenv').config();
const {Redis} = require('ioredis');


const client = new Redis(
   process.env.REDIS_URL
   );

client.on('connect', function() {
    console.log('Connected to Redis...');
  });
  
 client.on('error', function (err) {
    console.error('Redis error:', err);
  });
  
module.exports = client;

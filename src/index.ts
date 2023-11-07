import dotenv from 'dotenv';
import connectDB from './db/index.js';
import { app } from './app.js';

dotenv.config({
  path: '../.env'
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.info(`app is listening on port ${PORT}...`);
  });
}).catch((err) => {
  console.log('MONGODB not connected!!!', err);
});

const PORT = process.env.PORT || 8000;
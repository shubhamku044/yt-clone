import dotenv from 'dotenv';
import express, { Express } from 'express';
import connectDB from './db/index.js';

dotenv.config({
  path: '../.env'
});

const app: Express = express();

connectDB();

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.info(`app is listening on port ${PORT}...`);
});
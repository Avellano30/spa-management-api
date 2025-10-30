import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import mongoose from 'mongoose';
import router from './router';

require('dotenv').config();

const app = express();
app.use(cors());

app.use(compression());
app.use(cookieParser());
app.use(bodyParser.json());
app.use('/', router());

const port = 3000;

app.get('/keep-alive', (req, res) => {
  res.send('Server is alive!');
});

const DB_NAME = process.env.DB_NAME;
const MONGO_URL = `${process.env.MONGO_URL}`;

mongoose.Promise = global.Promise;
mongoose.connect(MONGO_URL, {
    dbName: DB_NAME, // Specify the database name here
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('Error connecting to MongoDB:', err);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('tiny'));

const authLimiter = rateLimit({ windowMs:15*60*1000, max:100 });
app.use('/api/auth', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);

app.get('/', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
(async () => {
  await connectDB();
  const server = app.listen(PORT, () => console.log(`Listening ${PORT}`));
  process.on('SIGINT', () => {
    console.log('Shutting down');
    server.close(() => process.exit(0));
  });
})();

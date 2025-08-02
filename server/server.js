// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Utils
const logger = require('./utils/logger'); // You’ll need to create this file (see below)

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Routes and sockets
const pollSocket = require('./sockets/pollSocket');
const pollRoutes = require('./routes/pollRoutes');

// Global Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());

// Rate limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.'
});
app.use('/api/', apiLimiter);

// Routes
app.use('/api/polls', pollRoutes);
app.get('/', (req, res) => res.json({ status: 'OK', message: 'Live Polling Backend API running' }));
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', uptime: process.uptime() }));

// Socket connection
io.on('connection', (socket) => {
  logger.info(`🟢 New client connected: ${socket.id}`);
  pollSocket(io, socket);
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => logger.info(`🚀 Server running on http://localhost:${PORT}`));

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('🛑 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('✅ Server closed.');
    process.exit(0);
  });
});

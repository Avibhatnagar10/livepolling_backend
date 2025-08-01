const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const pollSocket = require('./sockets/pollSocket');
const pollRoutes = require('./routes/pollRoutes');

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/api/polls', pollRoutes);


// Routes
app.get('/', (req, res) => res.json({ status: 'OK', message: 'Live Polling Backend API running' }));



// Socket connection
io.on('connection', (socket) => {
  console.log('🟢 New client connected:', socket.id);
  pollSocket(io, socket);
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

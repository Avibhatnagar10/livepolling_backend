const { v4: uuidv4 } = require('uuid');
const activePolls = {};
const voters = {}; // socket.id -> Set of pollIds they've voted on

module.exports = (io, socket) => {
  console.log('⚡ New connection:', socket.id);
  voters[socket.id] = new Set();

  // ✅ Students join waiting room
  socket.on('join-waiting-room', () => {
    socket.join('waiting-room');
    console.log(`👨‍🎓 Student ${socket.id} joined waiting-room`);
  });

  // ✅ Teacher creates a poll
  socket.on('create-poll', ({ question, options, duration = 60000, pollId }) => {
    const id = pollId || uuidv4();
    console.log(`📝 Creating poll: ${id}`);

    // 🔥 End previous active poll by this teacher if exists
    for (const prevId in activePolls) {
      const prevPoll = activePolls[prevId];
      if (prevPoll.createdBy === socket.id && prevPoll.isActive) {
        prevPoll.isActive = false;
        io.to(prevId).emit('poll-ended', prevPoll);
      }
    }

    // ✅ Create new poll
    activePolls[id] = {
      pollId: id,
      question,
      options: options.map(opt => ({ ...opt, votes: 0, percent: 0 })),
      totalVotes: 0,
      isActive: true,
      createdBy: socket.id,
      endsAt: Date.now() + duration
    };

    socket.join(id);

    // ✅ Emit new poll to all students
    io.to('waiting-room').emit('poll-started', activePolls[id]);

    // ✅ Move students to this poll room
    const waitingRoomSockets = io.sockets.adapter.rooms.get('waiting-room');
    if (waitingRoomSockets) {
      for (const studentSocketId of waitingRoomSockets) {
        const studentSocket = io.sockets.sockets.get(studentSocketId);
        if (studentSocket) {
          studentSocket.join(id);
        }
      }
    }

    // ⏲ Auto-end poll
    setTimeout(() => {
      const poll = activePolls[id];
      if (poll && poll.isActive) {
        poll.isActive = false;
        io.to(id).emit('poll-ended', poll);
      }
    }, duration);

    socket.emit('poll-created', { pollId: id });
  });

  // ✅ Student joins poll manually (optional feature)
  socket.on('join-poll', ({ pollId }) => {
    const poll = activePolls[pollId];
    if (poll && poll.isActive) {
      socket.join(pollId);
      socket.emit('poll-joined', poll);
    } else {
      socket.emit('poll-error', { message: 'Poll not found or inactive.' });
    }
  });

  // ✅ Student submits vote
  socket.on('submit-answer', ({ pollId, optionIndex }) => {
    const poll = activePolls[pollId];
    if (!poll || !poll.isActive) {
      return socket.emit('poll-error', { message: 'Poll is closed or does not exist.' });
    }

    if (voters[socket.id]?.has(pollId)) {
      return socket.emit('poll-error', { message: 'Already voted in this poll.' });
    }

    poll.options[optionIndex].votes += 1;
    poll.totalVotes += 1;
    voters[socket.id].add(pollId);

    poll.options = poll.options.map(opt => ({
      ...opt,
      percent: Math.round((opt.votes / poll.totalVotes) * 100)
    }));

    io.to(pollId).emit('poll-update', poll);
  });

  // ✅ Manual early end by teacher
  socket.on('end-poll', ({ pollId }) => {
    const poll = activePolls[pollId];
    if (poll && poll.createdBy === socket.id && poll.isActive) {
      poll.isActive = false;
      io.to(pollId).emit('poll-ended', poll);
    }
  });

  // ✅ Get results
  socket.on('get-results', ({ pollId }) => {
    const poll = activePolls[pollId];
    if (poll) {
      socket.emit('poll-results', poll);
    } else {
      socket.emit('poll-error', { message: 'Poll not found.' });
    }
  });

  // 🔌 Disconnect logic
  socket.on('disconnect', () => {
    console.log('🔴 Disconnected:', socket.id);
    delete voters[socket.id];

    for (const pollId in activePolls) {
      const poll = activePolls[pollId];
      if (poll.createdBy === socket.id && poll.isActive) {
        poll.isActive = false;
        io.to(pollId).emit('poll-ended', poll);
      }
    }
  });
};

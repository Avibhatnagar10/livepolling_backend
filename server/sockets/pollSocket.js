const activePolls = {};

module.exports = (io, socket) => {
  // Teacher creates a poll
  socket.on('create-poll', ({ question, options, duration }) => {
    const pollId = socket.id; // Unique per teacher connection
    activePolls[pollId] = {
      question,
      options: options.map(opt => ({ ...opt, votes: 0 })),
      totalVotes: 0,
      isActive: true
    };

    // Teacher joins their own room (optional for future features)
    socket.join(pollId);

    // 🔥 FIX: Broadcast to all clients (students)
    io.emit('poll-started', { ...activePolls[pollId], pollId });

    // Auto-close the poll after duration (default 60s)
    setTimeout(() => {
      if (activePolls[pollId]) {
        activePolls[pollId].isActive = false;
        io.emit('poll-ended', { ...activePolls[pollId], pollId });
      }
    }, duration || 60000);
  });

  // Student submits an answer
  socket.on('submit-answer', ({ pollId, optionIndex }) => {
    const poll = activePolls[pollId];
    if (!poll || !poll.isActive) return;

    poll.options[optionIndex].votes += 1;
    poll.totalVotes += 1;

    // Recalculate percentages
    const updatedOptions = poll.options.map(opt => ({
      ...opt,
      percent: poll.totalVotes > 0
        ? Math.round((opt.votes / poll.totalVotes) * 100)
        : 0
    }));

    // Update poll data and broadcast
    activePolls[pollId].options = updatedOptions;

    io.emit('poll-update', updatedOptions);
  });

  // Teacher asks for results manually
  socket.on('get-results', ({ pollId }) => {
    const poll = activePolls[pollId];
    if (poll) {
      io.emit('poll-results', { ...poll, pollId });
    }
  });

  // Teacher ends poll early
  socket.on('end-poll', ({ pollId }) => {
    const poll = activePolls[pollId];
    if (poll) {
      poll.isActive = false;
      io.emit('poll-ended', { ...poll, pollId });
    }
  });

  // Socket disconnect
  socket.on('disconnect', () => {
    console.log('🔴 Disconnected:', socket.id);
    // Optional: clean up activePolls[socket.id] if needed
  });
};

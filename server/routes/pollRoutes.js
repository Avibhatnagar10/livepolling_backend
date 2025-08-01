const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const polls = []; // In-memory store for now

// Create a new poll
router.post('/create', (req, res) => {
  const { question, options } = req.body;

  if (!question || !options || options.length < 2) {
    return res.status(400).json({ error: 'Question and at least two options are required' });
  }

  const newPoll = {
    id: uuidv4(),
    question,
    options: options.map(opt => ({
      text: opt.text,
      isCorrect: opt.isCorrect || false,
      votes: 0
    })),
    totalVotes: 0,
    createdAt: new Date()
  };

  polls.push(newPoll);
  return res.status(201).json({
    message: 'Poll created successfully',
    poll: newPoll
  });
});

// Get all polls
router.get('/all', (req, res) => {
  res.json(polls.slice().reverse()); // Return a reversed copy (newest first)
});

// Get a single poll by ID
router.get('/:id', (req, res) => {
  const poll = polls.find(p => p.id === req.params.id);
  if (!poll) return res.status(404).json({ error: 'Poll not found' });
  res.json(poll);
});

// Delete a poll
router.delete('/:id', (req, res) => {
  const index = polls.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Poll not found' });

  polls.splice(index, 1);
  res.json({ message: 'Poll deleted successfully' });
});

module.exports = router;

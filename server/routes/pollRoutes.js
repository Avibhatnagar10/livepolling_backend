const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const polls = []; // In-memory store (swap with DB later)

// @route   POST /api/polls/create
// @desc    Create a new poll
router.post(
  '/create',
  [
    body('question').notEmpty().withMessage('Question is required'),
    body('options')
      .isArray({ min: 2 })
      .withMessage('At least two options are required'),
    body('options.*.text')
      .notEmpty()
      .withMessage('Option text cannot be empty')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { question, options } = req.body;

    const newPoll = {
      id: uuidv4(),
      question,
      options: options.map(opt => ({
        text: opt.text,
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
  }
);

// @route   GET /api/polls/all
// @desc    Get all polls
router.get('/all', (req, res) => {
  res.json(polls.slice().reverse()); // Newest first
});

// @route   GET /api/polls/:id
// @desc    Get a single poll
router.get('/:id', (req, res) => {
  const poll = polls.find(p => p.id === req.params.id);
  if (!poll) return res.status(404).json({ error: 'Poll not found' });
  res.json(poll);
});

// @route   DELETE /api/polls/:id
// @desc    Delete a poll
router.delete('/:id', (req, res) => {
  const index = polls.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Poll not found' });

  polls.splice(index, 1);
  res.json({ message: 'Poll deleted successfully' });
});

module.exports = router;

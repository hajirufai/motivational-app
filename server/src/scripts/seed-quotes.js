const mongoose = require('mongoose');
const Quote = require('../models/quote.model');
require('dotenv').config();

// Sample quotes data
const sampleQuotes = [
  {
    text: 'The only way to do great work is to love what you do.',
    author: 'Steve Jobs',
    tags: ['inspiration', 'work', 'passion']
  },
  {
    text: 'Life is what happens when you\'re busy making other plans.',
    author: 'John Lennon',
    tags: ['life', 'planning']
  },
  {
    text: 'The future belongs to those who believe in the beauty of their dreams.',
    author: 'Eleanor Roosevelt',
    tags: ['future', 'dreams', 'belief']
  },
  {
    text: 'Success is not final, failure is not fatal: It is the courage to continue that counts.',
    author: 'Winston Churchill',
    tags: ['success', 'failure', 'courage']
  },
  {
    text: 'In the middle of difficulty lies opportunity.',
    author: 'Albert Einstein',
    tags: ['opportunity', 'difficulty', 'challenge']
  },
  {
    text: 'Believe you can and you\'re halfway there.',
    author: 'Theodore Roosevelt',
    tags: ['belief', 'confidence']
  },
  {
    text: 'The best way to predict the future is to create it.',
    author: 'Peter Drucker',
    tags: ['future', 'creation']
  },
  {
    text: 'It does not matter how slowly you go as long as you do not stop.',
    author: 'Confucius',
    tags: ['perseverance', 'progress']
  },
  {
    text: 'Everything you\'ve ever wanted is on the other side of fear.',
    author: 'George Addair',
    tags: ['fear', 'desire', 'courage']
  },
  {
    text: 'The only limit to our realization of tomorrow will be our doubts of today.',
    author: 'Franklin D. Roosevelt',
    tags: ['doubt', 'limitation', 'future']
  }
];

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    return seedQuotes();
  })
  .then(() => {
    console.log('Quotes seeded successfully');
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Error seeding quotes:', err);
    mongoose.connection.close();
  });

async function seedQuotes() {
  // Clear existing quotes
  await Quote.deleteMany({});
  console.log('Cleared existing quotes');
  
  // Insert sample quotes
  const result = await Quote.insertMany(sampleQuotes);
  console.log(`Inserted ${result.length} quotes`);
  
  return result;
}
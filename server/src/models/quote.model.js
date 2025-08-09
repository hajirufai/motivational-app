const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Quote text is required'],
    trim: true,
    maxlength: [500, 'Quote text cannot be more than 500 characters']
  },
  author: {
    type: String,
    required: [true, 'Author name is required'],
    trim: true,
    maxlength: [100, 'Author name cannot be more than 100 characters']
  },
  source: {
    type: String,
    trim: true,
    maxlength: [200, 'Source cannot be more than 200 characters']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Create text index for searching
quoteSchema.index({ text: 'text', author: 'text' });

// Create index on tags for faster filtering
quoteSchema.index({ tags: 1 });

// Static method to get a random quote
quoteSchema.statics.getRandom = async function() {
  const count = await this.countDocuments();
  const random = Math.floor(Math.random() * count);
  return this.findOne().skip(random);
};

// Method to increment view count
quoteSchema.methods.incrementViews = async function() {
  this.views += 1;
  return this.save();
};

const Quote = mongoose.model('Quote', quoteSchema);

module.exports = Quote;
/**
 * Script to create an admin user for the Motivational Quotes Application
 * Run this script with Node.js: node create-admin.js
 */

require('dotenv').config({ path: '../server/.env' });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// MongoDB connection
// Use MongoDB Atlas connection from user's environment
const MONGODB_URI = 'mongodb+srv://hajirufai:vAhAExrcD4huFebx@cluster0.yefacyv.mongodb.net/motivational-quotes';
console.log('Using MongoDB URI:', MONGODB_URI);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Import the existing User model
const User = require('../server/src/models/user.model');

// Function to create admin user
async function createAdminUser(email, password, name) {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log(`Admin user with email ${email} already exists.`);
        return existingUser;
      } else {
        // Update existing user to admin
        existingUser.role = 'admin';
        await existingUser.save();
        console.log(`User ${email} updated to admin role.`);
        return existingUser;
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin user with a temporary firebaseUid
    const adminUser = new User({
      firebaseUid: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      displayName: name,
      role: 'admin'
    });

    await adminUser.save();
    console.log(`Admin user ${email} created successfully.`);
    return adminUser;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Prompt for admin user details
function promptForAdminDetails() {
  return new Promise((resolve) => {
    rl.question('Enter admin email: ', (email) => {
      rl.question('Enter admin password: ', (password) => {
        rl.question('Enter admin name: ', (name) => {
          resolve({ email, password, name });
          rl.close();
        });
      });
    });
  });
}

// Main function
async function main() {
  try {
    // Check if command line arguments are provided
    const args = process.argv.slice(2);
    let email, password, name;

    if (args.length >= 3) {
      // Use command line arguments
      [email, password, name] = args;
      console.log(`Using provided details for admin user: ${email}`);
    } else {
      // Prompt for details
      const details = await promptForAdminDetails();
      email = details.email;
      password = details.password;
      name = details.name;
    }

    // Create admin user
    await createAdminUser(email, password, name);
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

// Run the script
main();
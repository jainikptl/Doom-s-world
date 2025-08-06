// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sendMail = require('./utils/mailer');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 📩 POST: Send Email for Different Events
app.post('/api/notify', async (req, res) => {
  const { email, name, event } = req.body;

  let subject = '';
  let html = '';

  switch (event) {
    case 'shortlisted':
      subject = '🎉 You have been shortlisted!';
      html = `<p>Congratulations ${name}, you have been <b>shortlisted</b> for the next round.</p>`;
      break;
    case 'rejected':
      subject = '😔 Application Status - Rejected';
      html = `<p>Hi ${name}, thank you for applying. Unfortunately, you have not been shortlisted.</p>`;
      break;
    case 'interview':
      subject = '📅 Interview Scheduled';
      html = `<p>Hi ${name}, your interview has been scheduled. Please check your dashboard for more details.</p>`;
      break;
    case 'task-assigned':
      subject = '📝 Task Assigned';
      html = `<p>Hi ${name}, a new task has been assigned to you. Please check your dashboard.</p>`;
      break;
    case 'task-success':
      subject = '✅ Task Completed Successfully';
      html = `<p>Great job ${name}! Your task has been marked as <b>completed successfully</b>.</p>`;
      break;
    case 'task-failure':
      subject = '❌ Task Not Completed Successfully';
      html = `<p>Hi ${name}, unfortunately, your task could not be marked as completed. Please try again.</p>`;
      break;
    default:
      return res.status(400).json({ message: 'Unknown event type' });
  }

  try {
    await sendMail(email, subject, html);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send email', error });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// utils/mailer.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

module.exports = sendMail;
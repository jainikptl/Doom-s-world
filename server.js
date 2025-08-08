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

const themeColor = "#6366F1"; // Updated to match your design theme
const secondaryColor = "#EC4899";
const successColor = "#10B981";
const warningColor = "#F59E0B";
const dangerColor = "#EF4444";
const dashboardUrl = "https://doom-s-world.vercel.app/"; // Replace with your actual dashboard URL

let subject = "";
let html = "";

// Common email styles that match your theme
const emailStyles = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  
  .email-container {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    background: linear-gradient(135deg, #0F0F23 0%, #1A1B3E 100%);
    color: #FFFFFF;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  }
  
  .header-flex {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
  text-align: center;
}
  
  .email-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
    padding: 40px 30px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  
  .email-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 30% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 60%);
    pointer-events: none;
  }
  
  .logo-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
    padding: 0; /* Ensure no internal padding */
    box-sizing: border-box;
  }
  
  .logo-image {
    width: 60px;
    height: 60px;
    object-fit: cover;
    display: block;
    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
  }
  
  .email-title {
    font-size: 28px;
    font-weight: 700;
    margin: 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  .email-body {
    padding: 40px 30px;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(20px);
  }
  
  .greeting {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .greeting-icon {
    font-size: 24px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    flex-shrink: 0;
  }
  
  .message-content {
    font-size: 16px;
    line-height: 1.6;
    color: #B8BCC8;
    margin-bottom: 30px;
  }
  
  .message-content p {
    margin-bottom: 15px;
  }
  
  .message-content strong {
    color: #FFFFFF;
    font-weight: 600;
  }
  
  .cta-button {
    display: inline-block;
    padding: 16px 32px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #FFFFFF !important;
    text-decoration: none;
    border-radius: 12px;
    font-weight: 600;
    font-size: 16px;
    text-align: center;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
    border: none;
  }
  
  .cta-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.5);
  }
  
  .email-footer {
    padding: 30px;
    text-align: center;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.2);
  }
  
  .signature {
    font-weight: 600;
    color: #FFFFFF;
    margin-top: 20px;
  }
  
  .status-badge {
    display: inline-block;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    margin: 10px 0;
  }
  
  .badge-success {
    background: linear-gradient(135deg, #10B981 0%, #34D399 100%);
    color: #FFFFFF;
  }
  
  .badge-danger {
    background: linear-gradient(135deg, #EF4444 0%, #F87171 100%);
    color: #FFFFFF;
  }
  
  .badge-warning {
    background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%);
    color: #FFFFFF;
  }
  
  .badge-info {
    background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
    color: #FFFFFF;
  }
  

  
  .logo-container {
    font-size: 2rem;
  }
  
  .divider {
    height: 2px;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
    margin: 30px 0;
    border: none;
  }
  
  /* Responsive Design */
  @media (max-width: 600px) {
    .email-container {
      margin: 5px;
      border-radius: 12px;
    }
    
    .email-header {
      padding: 25px 15px;
    }
    
    .email-body {
      padding: 25px 15px;
    }
    
    .email-footer {
      padding: 20px 15px;
    }
    
    .email-title {
      font-size: 20px;
    }
    
    .greeting {
      font-size: 18px;
      flex-direction: column;
      gap: 8px;
      text-align: center;
    }
    
    .greeting-icon {
      font-size: 20px;
    }
    
    .logo-container {
      width: 60px;
      height: 60px;
      margin-bottom: 15px;
    }
    
    .logo-image {
      width: 45px;
      height: 45px;
    }
    
    .icon-container {
      font-size: 24px;
      margin-bottom: 12px;
    }
    
    .message-content {
      font-size: 14px;
    }
    
    .status-badge {
      font-size: 12px;
      padding: 6px 12px;
    }
    
    .cta-button {
      display: block;
      width: 100%;
      padding: 14px 20px;
      font-size: 14px;
      box-sizing: border-box;
    }
    
    .signature {
      font-size: 14px;
    }
    
    .divider {
      margin: 20px 0;
    }
  }
  
  @media (max-width: 480px) {
    .email-container {
      margin: 0;
      border-radius: 0;
      min-height: 100vh;
    }
    
    .email-header {
      padding: 20px 12px;
    }
    
    .email-body {
      padding: 20px 12px;
    }
    
    .email-footer {
      padding: 15px 12px;
    }
    
    .email-title {
      font-size: 18px;
    }
    
    .greeting {
      font-size: 16px;
    }
    
    .greeting-icon {
      font-size: 18px;
    }
    
    .logo-container {
      width: 50px;
      height: 50px;
      margin-bottom: 12px;
    }
    
    .logo-image {
      width: 38px;
      height: 38px;
    }
    
    .icon-container {
      font-size: 20px;
      margin-bottom: 10px;
    }
    
    .message-content {
      font-size: 13px;
      line-height: 1.5;
    }
    
    .status-badge {
      font-size: 11px;
      padding: 5px 10px;
    }
    
    .cta-button {
      padding: 12px 16px;
      font-size: 13px;
    }
  }
  
  @media (max-width: 320px) {
    .email-header {
      padding: 15px 10px;
    }
    
    .email-body {
      padding: 15px 10px;
    }
    
    .email-footer {
      padding: 12px 10px;
    }
    
    .email-title {
      font-size: 16px;
    }
    
    .greeting {
      font-size: 15px;
    }
    
    .logo-container {
      width: 45px;
      height: 45px;
    }
    
    .logo-image {
      width: 34px;
      height: 34px;
    }
    
    .message-content {
      font-size: 12px;
    }
    
    .cta-button {
      padding: 10px 14px;
      font-size: 12px;
    }
  }
</style>`;

switch (event) {
  case 'shortlisted':
    subject = '🎉 You Have Been Shortlisted - Dooms Digital World';
    html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Shortlisted - Dooms Digital World</title>
        ${emailStyles}
      </head>
      <body style="margin: 0; padding: 20px; background: linear-gradient(135deg, #0F0F23 0%, #2D2F5E 100%);">
        <div class="email-container">
          <div class="email-header">
            <div class="logo-container">
              <img src="https://s3.amazonaws.com/comicgeeks/characters/avatars/152.jpg?t=1709184276" alt="Dooms Digital World Logo" class="logo-image">
            </div>
            <h1 class="email-title">Dooms Digital World</h1>
          </div>
          
          <div class="email-body">
            <h2 class="greeting">
              <span class="greeting-icon">🎉</span>
              <span>Congratulations, ${name}!</span>
            </h2>
            
            <div class="status-badge badge-success">
              ✅ SHORTLISTED
            </div>
            
            <hr class="divider">
            
            <div class="message-content">
              <p>We're thrilled to inform you that you've been <strong>shortlisted</strong> for the next round of our selection process!</p>
              
              <p>Your application stood out among many talented candidates, and we're excited to move forward with you in our recruitment journey.</p>
              
              <p><strong>What's Next?</strong></p>
              <p>• Check your dashboard for detailed next steps<br>
              • Prepare for the upcoming evaluation phase<br>
              • Stay tuned for further communications</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" class="cta-button">
                🚀 Access Your Dashboard
              </a>
            </div>
          </div>
          
          <div class="email-footer">
            <p style="color: #6C7293; font-size: 14px; margin: 0;">
              This is an automated message from Dooms Digital World recruitment system.
            </p>
            <p class="signature">— <strong>The Doom Recruitment Team</strong> 🦹‍♂️</p>
          </div>
        </div>
      </body>
      </html>`;
    break;

  case 'rejected':
    subject = '📋 Application Status Update - Dooms Digital World';
    html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Status - Dooms Digital World</title>
        ${emailStyles}
      </head>
      <body style="margin: 0; padding: 20px; background: linear-gradient(135deg, #0F0F23 0%, #2D2F5E 100%);">
        <div class="email-container">
          <div class="email-header">
            <div class="logo-container">
              <img src="https://s3.amazonaws.com/comicgeeks/characters/avatars/152.jpg?t=1709184276" alt="Dooms Digital World Logo" class="logo-image">
            </div>
            <h1 class="email-title">Dooms Digital World</h1>
          </div>
          
          <div class="email-body">
            <h2 class="greeting">
              <span class="greeting-icon">📋</span>
              <span>Hi ${name},</span>
            </h2>
            
            <div class="status-badge badge-danger">
              ❌ NOT SHORTLISTED
            </div>
            
            <hr class="divider">
            
            <div class="message-content">
              <p>Thank you for your interest in joining Dooms Digital World and for taking the time to apply.</p>
              
              <p>After careful consideration of all applications, we regret to inform you that you haven't been shortlisted for this round of recruitment.</p>
              
              <p><strong>This isn't the end!</strong></p>
              <p>• Keep developing your skills and experience<br>
              • Watch for future opportunities<br>
              • We encourage you to apply again in the future</p>
              
              <p>We appreciate your interest in our organization and wish you the best in your career journey.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" class="cta-button">
                📊 View Your Dashboard
              </a>
            </div>
          </div>
          
          <div class="email-footer">
            <p style="color: #6C7293; font-size: 14px; margin: 0;">
              This is an automated message from Dooms Digital World recruitment system.
            </p>
            <p class="signature">— <strong>The Doom Recruitment Team</strong> 🦹‍♂️</p>
          </div>
        </div>
      </body>
      </html>`;
    break;

  case 'interview':
    subject = '📅 Interview Scheduled - Dooms Digital World';
    html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Interview Scheduled - Dooms Digital World</title>
        ${emailStyles}
      </head>
      <body style="margin: 0; padding: 20px; background: linear-gradient(135deg, #0F0F23 0%, #2D2F5E 100%);">
        <div class="email-container">
          <div class="email-header">
            <div class="logo-container">
              <img src="https://s3.amazonaws.com/comicgeeks/characters/avatars/152.jpg?t=1709184276" alt="Dooms Digital World Logo" class="logo-image">
            </div>
            <h1 class="email-title">Dooms Digital World</h1>
          </div>
          
          <div class="email-body">
            <h2 class="greeting">
              <span class="greeting-icon">📅</span>
              <span>Interview Scheduled</span>
            </h2>
            
            <div class="status-badge badge-info">
              🎤 INTERVIEW SCHEDULED
            </div>
            
            <hr class="divider">
            
            <div class="message-content">
              <p>Hi ${name},</p>
              
              <p>Great news! Your interview has been <strong>scheduled</strong> as part of our selection process.</p>
              
              <p><strong>Important:</strong></p>
              <p>• Check your dashboard for complete interview details<br>
              • Review the date, time, and format<br>
              • Prepare thoroughly for the discussion<br>
              • Ensure stable internet connection if it's virtual</p>
              
              <p>We look forward to speaking with you and learning more about your potential contribution to our team.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" class="cta-button">
                📋 View Interview Details
              </a>
            </div>
          </div>
          
          <div class="email-footer">
            <p style="color: #6C7293; font-size: 14px; margin: 0;">
              This is an automated message from Dooms Digital World recruitment system.
            </p>
            <p class="signature">— <strong>The Doom Recruitment Team</strong> 🦹‍♂️</p>
          </div>
        </div>
      </body>
      </html>`;
    break;

  case 'interview-reschedule':
    subject = '🔄 Interview Rescheduled - Dooms Digital World';
    html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Interview Rescheduled - Dooms Digital World</title>
        ${emailStyles}
      </head>
      <body style="margin: 0; padding: 20px; background: linear-gradient(135deg, #0F0F23 0%, #2D2F5E 100%);">
        <div class="email-container">
          <div class="email-header">
            <div class="logo-container">
              <img src="https://s3.amazonaws.com/comicgeeks/characters/avatars/152.jpg?t=1709184276" alt="Dooms Digital World Logo" class="logo-image">
            </div>
            <h1 class="email-title">Dooms Digital World</h1>
          </div>
          
          <div class="email-body">
            <h2 class="greeting">
              <span class="greeting-icon">🔄</span>
              <span>Interview Rescheduled</span>
            </h2>
            
            <div class="status-badge badge-warning">
              📅 RESCHEDULED
            </div>
            
            <hr class="divider">
            
            <div class="message-content">
              <p>Hi ${name},</p>
              
              <p>We need to inform you that your interview has been <strong>rescheduled</strong> due to unforeseen circumstances.</p>
              
              <p><strong>Action Required:</strong></p>
              <p>• Check your dashboard immediately for the new date and time<br>
              • Update your calendar accordingly<br>
              • Confirm your availability for the new slot<br>
              • Contact us if there are any conflicts</p>
              
              <p>We apologize for any inconvenience this may cause and appreciate your understanding.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" class="cta-button">
                📅 Check New Schedule
              </a>
            </div>
          </div>
          
          <div class="email-footer">
            <p style="color: #6C7293; font-size: 14px; margin: 0;">
              This is an automated message from Dooms Digital World recruitment system.
            </p>
            <p class="signature">— <strong>The Doom Recruitment Team</strong> 🦹‍♂️</p>
          </div>
        </div>
      </body>
      </html>`;
    break;

  case 'task-assigned':
    subject = '📝 New Task Assigned - Dooms Digital World';
    html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Assigned - Dooms Digital World</title>
        ${emailStyles}
      </head>
      <body style="margin: 0; padding: 20px; background: linear-gradient(135deg, #0F0F23 0%, #2D2F5E 100%);">
        <div class="email-container">
          <div class="email-header">
            <div class="logo-container">
              <img src="https://s3.amazonaws.com/comicgeeks/characters/avatars/152.jpg?t=1709184276" alt="Dooms Digital World Logo" class="logo-image">
            </div>
            <h1 class="email-title">Dooms Digital World</h1>
          </div>
          
          <div class="email-body">
            <h2 class="greeting">
              <span class="greeting-icon">📝</span>
              <span>New Task Assigned</span>
            </h2>
            
            <div class="status-badge badge-info">
              📋 TASK ASSIGNED
            </div>
            
            <hr class="divider">
            
            <div class="message-content">
              <p>Hi ${name},</p>
              
              <p>A new task has been <strong>assigned</strong> to you as part of our evaluation process.</p>
              
              <p><strong>Next Steps:</strong></p>
              <p>• Log into your dashboard to view task details<br>
              • Read all instructions carefully<br>
              • Note the submission deadline<br>
              • Start working on it at your earliest convenience</p>
              
              <p>This task is designed to assess your skills and capabilities. Give it your best effort!</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" class="cta-button">
                🚀 Start Task
              </a>
            </div>
          </div>
          
          <div class="email-footer">
            <p style="color: #6C7293; font-size: 14px; margin: 0;">
              This is an automated message from Dooms Digital World recruitment system.
            </p>
            <p class="signature">— <strong>The Doom Recruitment Team</strong> 🦹‍♂️</p>
          </div>
        </div>
      </body>
      </html>`;
    break;

  case 'task-success':
    subject = '✅ Task Completed Successfully - Dooms Digital World';
    html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Success - Dooms Digital World</title>
        ${emailStyles}
      </head>
      <body style="margin: 0; padding: 20px; background: linear-gradient(135deg, #0F0F23 0%, #2D2F5E 100%);">
        <div class="email-container">
          <div class="email-header">
            <div class="header-flex">
              <div class="logo-container">
                <img src="https://s3.amazonaws.com/comicgeeks/characters/avatars/152.jpg?t=1709184276" alt="Dooms Digital World Logo" class="logo-image">
              </div>
              <h1 class="email-title">Dooms Digital World</h1>
            </div>
          </div>
          
          <div class="email-body">
            <h2 class="greeting">
              <span class="greeting-icon">🎉</span>
              <span>Excellent Work, ${name}!</span>
            </h2>
            
            <div class="status-badge badge-success">
              ✅ TASK COMPLETED
            </div>
            
            <hr class="divider">
            
            <div class="message-content">
              <p>Congratulations! Your task has been marked as <strong>successfully completed</strong>.</p>
              
              <p><strong>Outstanding Performance:</strong></p>
              <p>• Your submission met all requirements<br>
              • Quality of work was impressive<br>
              • Delivered within the deadline<br>
              • Demonstrated strong capabilities</p>
              
              <p>Keep up the excellent work! This achievement brings you one step closer to joining our team.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" class="cta-button">
                🏆 View Results
              </a>
            </div>
          </div>
          
          <div class="email-footer">
            <p style="color: #6C7293; font-size: 14px; margin: 0;">
              This is an automated message from Dooms Digital World recruitment system.
            </p>
            <p class="signature">— <strong>The Doom Recruitment Team</strong> 🦹‍♂️</p>
          </div>
        </div>
      </body>
      </html>`;
    break;

  case 'task-failure':
    subject = '🔄 Task Review Required - Dooms Digital World';
    html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Review - Dooms Digital World</title>
        ${emailStyles}
      </head>
      <body style="margin: 0; padding: 20px; background: linear-gradient(135deg, #0F0F23 0%, #2D2F5E 100%);">
        <div class="email-container">
          <div class="email-header">
            <div class="header-flex">
              <div class="logo-container">
                <img src="https://s3.amazonaws.com/comicgeeks/characters/avatars/152.jpg?t=1709184276" alt="Dooms Digital World Logo" class="logo-image">
              </div>
              <h1 class="email-title">Dooms Digital World</h1>
            </div>
          </div>
          
          <div class="email-body">
            <h2 class="greeting">
              <span class="greeting-icon">🔄</span>
              <span>Hi ${name},</span>
            </h2>
            
            <div class="status-badge badge-warning">
              ⚠️ NEEDS REVIEW
            </div>
            
            <hr class="divider">
            
            <div class="message-content">
              <p>We've reviewed your task submission, and unfortunately, it could not be marked as completed successfully at this time.</p>
              
              <p><strong>Next Steps:</strong></p>
              <p>• Review the detailed feedback in your dashboard<br>
              • Check the task requirements again<br>
              • Make necessary improvements if resubmission is allowed<br>
              • Contact us if you need clarification</p>
              
              <p>Don't get discouraged! This is part of the learning process, and we believe in giving candidates opportunities to improve.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" class="cta-button">
                📊 Review Feedback
              </a>
            </div>
          </div>
          
          <div class="email-footer">
            <p style="color: #6C7293; font-size: 14px; margin: 0;">
              This is an automated message from Dooms Digital World recruitment system.
            </p>
            <p class="signature">— <strong>The Doom Recruitment Team</strong> 🦹‍♂️</p>
          </div>
        </div>
      </body>
      </html>`;
    break;

  default:
    console.error("Unknown event type");
    return;
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
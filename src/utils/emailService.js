const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Create a transporter using Ethereal (for dev/test)
  // In production, we would use SendGrid, Gmail, etc.
  const testAccount = await nodemailer.createTestAccount();

  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  });

  const message = {
    from: '"Smart Cafe Support" <support@smartcafe.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  const info = await transporter.sendMail(message);

  console.log('Message sent: %s', info.messageId);
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  
  return info;
};

module.exports = sendEmail;

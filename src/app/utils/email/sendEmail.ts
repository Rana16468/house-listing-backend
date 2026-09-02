import nodemailer from 'nodemailer';
import config from '../../config';


const sendEmail = async (to: string, html: string, subject?: string) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com.',
    port: 587,
    secure: config.NODE_ENV?.includes('production'),
    auth: {
      user: config.send_email.nodemailer_email,
      pass: config.send_email.nodemailer_password,
    },
  });

  await transporter.sendMail({
    from: config.send_email.nodemailer_email,
    to,
    subject: subject ? subject : 'House Rental System -House Reant ',
    text: 'time line under send house rant',
    html,
  });
};

export default sendEmail;
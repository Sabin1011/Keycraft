const nodemailer = require("nodemailer");
require("dotenv").config();   // make sure environment vars load

const sendEmail = async ({ to, subject, text }) => {
    try {
        // EMAIL + APP PASSWORD must be in .env
        // EMAIL_USER + EMAIL_PASS are common names, but yours uses EMAIL + PASSWORD
        if (!process.env.EMAIL || !process.env.EMAIL_PASS) {
            console.log("Email credentials missing in .env");
            return false;
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL,      // Gmail address
                pass: process.env.EMAIL_PASS    // App password (NOT Gmail login password)
            }
        });

        // Optional: Verify connection
        await transporter.verify();

        await transporter.sendMail({
            from: process.env.EMAIL,
            to,
            subject,
            text
        });

        console.log("Email sent successfully");
        return true;

    } catch (error) {
        console.log("Email error: ", error);
        return false;
    }
};

module.exports = sendEmail;

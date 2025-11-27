const nodemailer = require("nodemailer");
require("dotenv").config(); 

const sendEmail = async ({ to, subject, text, html  }) => {
    try {
 
        if (!process.env.EMAIL || !process.env.EMAIL_PASS) {
            console.log("Email credentials missing in .env");
            return false;
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL,      
                pass: process.env.EMAIL_PASS    
            }
        });

        await transporter.verify();

        await transporter.sendMail({
            from: process.env.EMAIL,
            to,
            subject,
            text,
            html 
        });

        console.log("Email sent successfully");
        return true;

    } catch (error) {
        console.log("Email error: ", error);
        return false;
    }
};

module.exports = sendEmail;

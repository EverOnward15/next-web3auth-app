// generate-rs256-token.js
import jwt from "jsonwebtoken";
import fs from "fs";

// Load your RSA private key (PEM format)
const privateKey = fs.readFileSync("./private.pem", "utf8"); // or use process.env.RSA_PRIVATE_KEY

const payload = {
  sub: "123456789", // Telegram user ID
  aud: "web3auth",
  iss: "https://next-web3auth-app.vercel.app/api/telegram-auth",
  id: "123456789",
  first_name: "John",
  last_name: "Doe",
  username: "johndoe",
  photo_url: "https://t.me/i/userpic/320/johndoe.jpg",
};

const token = jwt.sign(payload, privateKey, {
  algorithm: "RS256",
  expiresIn: "1h",
});

console.log("Generated RS256 JWT Token:\n", token);

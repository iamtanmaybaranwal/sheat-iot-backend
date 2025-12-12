const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const admin = require("firebase-admin");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// 🔐 Firebase Admin (from environment variable)
if (!process.env.SERVICE_ACCOUNT_JSON || !process.env.FIREBASE_DATABASE_URL) {
  console.error("Missing Firebase environment variables");
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.database();

// Health check
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// ESP data endpoint
app.post("/api/data/:deviceId", async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const data = req.body;

    await db.ref(`/devices/${deviceId}/latest`).set({
      ...data,
      timestamp: Date.now(),
    });

    io.emit(`update-${deviceId}`, data);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

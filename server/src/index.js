import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import adminRouter from "./controllers/admin.controller.js";
import timeslotRouter from "./controllers/timeslot.controller.js";
import registerRouter from "./controllers/register.controller.js";
import groupRouter from "./controllers/groups.controller.js";
import { Server } from "socket.io";
import { initDatabase } from "./database.js";
import model from "./model.js";
import https from "https";
import fs from "fs";
import helmet from "helmet";

// Hämtar den aktuella filens och dess mapps sökväg
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Skapar en Express-app och en HTTP-server
const app = express();

/* Nytt xss-attack */
app.use(helmet()); // Skyddar mot vanliga säkerhetsbrister inklusive XSS

/* Nytt HTTPS */
// Laddar in certifikat för att köra HTTPS
const options = {
  pfx: fs.readFileSync(path.join(__dirname, "keystore.p12")),
  passphrase: "123456", // Samma lösenord som användes vid skapandet av keystore
};

// Skapar HTTPS-server med certifikat
const server = https.createServer(options, app);

// Skapar en Socket.io-server ovanpå HTTPS-servern
const io = new Server(server, {
  cors: {
    origin: "https://127.0.0.1:5173", // Tillåt endast anslutningar från denna origin
    credentials: true,
  },
});

// Middleware som tillåter frontend att prata med backend + cookies + JSON
app.use(cors({ origin: "https://127.0.0.1:5173", credentials: true }));
app.use(express.json()); // Tillåter att vi skickar och tar emot JSON
app.use(cookieParser()); // Aktiverar cookie-parsing

// Setup för sessionshantering
app.use(
  session({
    secret: "secretkey", // Hemlig nyckel för att signera sessionen
    resave: false, // Anger att sessionen inte ska sparas om inte förändringar har gjorts
    saveUninitialized: false, // Förhindrar att en session sparas om den är tom
  }),
);

// Gör Socket.io-servern tillgänglig i hela appen
app.set("io", io);

// Skickar vidare till olika routers beroende på URL
app.use("/api/admin", adminRouter); 
app.use("/api/bookings", timeslotRouter);
app.use("/api/register", registerRouter);
app.use("/api/groups", groupRouter);

// Route för att kolla om användaren har en aktiv session
app.get("/api/check-session", (req, res) => {
  // Om ett användarnamn finns sparat i sessionen är användaren inloggad
  if (req.session.user) {
    return res.json({ authenticated: true, username: req.session.user });
  } else {
    return res.json({ authenticated: false });
  }
});

// Anger sökvägen till frontendens filer (client/dist)
const clientPath = path.join(__dirname, "../../client/dist");
// Servern använder denna mapp för att leverera statiska filer som HTML, CSS och JS till webbläsaren
app.use(express.static(clientPath));

// WebSocket-händelser
io.on("connection", (socket) => {
  console.log("A user connected");

  // Hantera förfrågningar om att reservera en tid
  socket.on("reserve-booking", async (data) => {
    const { time, assistant } = data;
    // Försöker reservera tiden i databasen och startar en nedräkning via io
    const reserved = await model.reserveBooking(time, assistant, io);

    if (reserved) {
      io.emit("booking-reserved", reserved); // Skicka till alla klienter att tiden är reserverad
    }
  });

  // Hantera förfrågningar om att avboka en reservation
  socket.on("cancel-reservation", async (data) => {
    const { time, assistant } = data;

    // Försöker avboka tiden
    const released = await model.cancelReservation(time, assistant);
    if (released) {
      io.emit("booking-released", released); // Meddelar alla klienter att tiden är ledig igen
    }
  });

  // Hantera bokningar av tider
  socket.on("book-booking", async (data) => {
    // Försöker boka tiden med angivna data
    const result = await model.bookBooking(
      data.time,
      data.assistant,
      data.bookedBy,
    );

    if (!result) {
      socket.emit("booking-booking-error", "Booking failed");
      return;
    }

    io.emit("booking-booked", result); // Meddelar alla klienter att tiden har bokats
  });

  // Hantera avbokning av en bokning
  socket.on("cancel-booking", async (data) => {
    const { time, assistant, bookedBy } = data;

    // Försöker avboka tiden via modellaget
    const cancelled = await model.cancelBooking(time, assistant, bookedBy);

    if (cancelled) {
      io.emit("booking-cancelled", cancelled); // Meddelar alla klienter att tiden är avbokad
    } else {
      socket.emit("booking-cancel-error", "Cancellation failed");
    }
  });

  // Hantera disconnect
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

// Initiera databasen
initDatabase();

// Starta servern på port 8989
server.listen(8989, () => {
  console.log("HTTPS server running at https://127.0.0.1:8989");
});

// Fångar upp alla övriga GET-förfrågningar och skickar frontendens index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(clientPath, "index.html"));
});

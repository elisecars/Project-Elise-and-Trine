import express from "express";
import { dbPromise } from "../database.js";
import { requireLogin, requireRole } from "../middleware.js";
import model from "../model.js";
import bcrypt from "bcrypt";
import { body, validationResult } from "express-validator";

const router = express.Router();

// Inloggning med validering av användarnamn och lösenord
router.post(
  "/login",
  [
    // Validerar användarnamn: tar bort mellanslag, escapar HTML och kräver att det inte är tomt
    body("username")
      .trim()
      .escape()
      .notEmpty()
      .withMessage("Username is required"),
    // Validerar att lösenord inte är tomt
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    // Kollar valideringsfel och skickar felmeddelande
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: errors.array(),
      });
    }

    const { username, password } = req.body;
    const db = await dbPromise; // Väntar på databasanslutningen

    try {
      // Hämtar användare från databasen med det angivna användarnamnet
      const user = await db.get("SELECT * FROM users WHERE username = ?", [
        username,
      ]);

      // Om användaren hittas och lösenordet är korrekt (hash-jämförelse med bcrypt)
      if (user && (await bcrypt.compare(password, user.password))) {
        // Spara användarinformation i sessionen
        req.session.user = { username: user.username, role: user.role };
        // Skicka tillbaka att inloggningen lyckades, samt användarroll
        res.json({ success: true, role: user.role });
      } else {
        // Om inloggningen misslyckas (fel användare eller lösenord)
        res.json({ success: false });
      }
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// Kollar om en användare har en aktiv session
router.get("/check-session", (req, res) => {
  // Om sessionen är aktiv, returnera användarnamn
  if (req.session.user) {
    res.json({
      authenticated: true,
      username: req.session.user.username,
      role: req.session.user.role,
    });
  } else {
    res.json({ authenticated: false });
  }
});

// POST: Lägg till ny tid (endast inloggade admins)
router.post("/", requireLogin, requireRole("assistant"), async (req, res) => {
  const {
    time,
    assistant,
    place,
    date,
    bookingStart,
    bookingEnd,
    postBookingDate,
    examination,
    cancellationDeadline,
  } = req.body; // Hämtar den nya tiden från användarens request

  // Kollar att både tid och assistent skickas med i anropet
  if (
    !time ||
    !assistant ||
    !place ||
    !date ||
    !bookingStart ||
    !bookingEnd ||
    !postBookingDate ||
    !examination ||
    !cancellationDeadline
  ) {
    return res.status(400).json({ error: "Invalid input" });
  }

  await model.addBooking(
    time,
    assistant,
    place,
    date,
    bookingStart,
    bookingEnd,
    postBookingDate,
    examination,
    cancellationDeadline,
  ); // Lägger till den nya tiden i databasen
  const allBookings = await model.getAllBookings(); // Hämtar uppdaterad lista av tider
  req.app.get("io").emit("bookings-updated", allBookings); // Skickar en uppdatering till alla anslutna klienter via WebSocket
  res.status(200).json({ success: true });
});

// DELETE: Ta bort en tid (endast inloggade admins)
router.delete("/", requireLogin, async (req, res) => {
  const {
    time,
    assistant,
    place,
    date,
    bookingStart,
    bookingEnd,
    examination,
    cancellationDeadline,
  } = req.body; // Hämtar vilken tid som ska tas bort
  await model.deleteBooking(
    time,
    assistant,
    place,
    date,
    bookingStart,
    bookingEnd,
    examination,
    cancellationDeadline,
  ); // Tar bort tiden från databasen
  const allBookings = await model.getAllBookings(); // Hämtar den uppdaterade listan av tider
  req.app.get("io").emit("bookings-updated", allBookings); // Meddelar alla klienter att tider har uppdaterats
  res.sendStatus(200);
});

// PUT: Ändra en befintlig tid (endast inloggade admins)
router.put("/", requireLogin, requireRole("assistant"), async (req, res) => {
  const {
    oldTime,
    newTime,
    assistant,
    place,
    date,
    bookingStart,
    bookingEnd,
    postBookingDate,
    examination,
    cancellationDeadline,
  } = req.body; // Hämtar den gamla och nya tiden samt assistenten

  // Kollar att alla nödvändiga parametrar skickas med
  if (
    !oldTime ||
    !newTime ||
    !assistant ||
    !place ||
    !date ||
    !bookingStart ||
    !bookingEnd ||
    !postBookingDate ||
    !examination ||
    !cancellationDeadline
  ) {
    return res.status(400).json({ error: "Invalid input" });
  }

  // Uppdatera booking i databasen
  try {
    await model.editBooking(
      oldTime,
      newTime,
      assistant,
      place,
      date,
      bookingStart,
      bookingEnd,
      postBookingDate,
      examination,
      cancellationDeadline,
    );

    // Hämtar alla uppdaterade bokningar efter ändringen
    const allBookings = await model.getAllBookings();

    // Skickar en WebSocket-händelse till alla klienter för att uppdatera bokningslistan i realtid
    req.app.get("io").emit("bookings-updated", allBookings);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update booking" });
  }
});

// POST: Spara ett utkast
router.post(
  "/draft",
  requireLogin,
  requireRole("assistant"),
  async (req, res) => {
    const assistant = req.session.user.username; // Hämtar användarnamnet från sessionen
    const draft = req.body; // Hämtar utkastdata från klienten

    try {
      await model.saveDraft(assistant, draft); // Sparar utkastet i databasen kopplat till användaren
      res.status(200).json({ success: true });
    } catch (err) {
      console.error("Failed to save draft:", err);
      res.status(500).json({ error: "Failed to save draft" });
    }
  },
);

// GET: Hämta ett utkast
router.get(
  "/draft",
  requireLogin,
  requireRole("assistant"),
  async (req, res) => {
    const assistant = req.session.user.username; // Hämtar användarnamn från sessionen

    try {
      const draft = await model.getDraft(assistant); // Hämtar utkast kopplat till assistenten från databasen
      res.status(200).json(draft || {}); // Returnerar utkastet eller tomt objekt om inget finns
    } catch (err) {
      console.error("Failed to fetch draft:", err);
      res.status(500).json({ error: "Failed to fetch draft" });
    }
  },
);

// DELETE: Rensa ett utkast
router.delete(
  "/draft",
  requireLogin,
  requireRole("assistant"),
  async (req, res) => {
    const assistant = req.session.user.username; // Hämtar inloggad assistents användarnamn

    try {
      await model.clearDraft(assistant); // Tar bort assistentens utkast från databasen
      res.status(200).json({ success: true });
    } catch (err) {
      console.error("Failed to clear draft:", err);
      res.status(500).json({ error: "Failed to clear draft" });
    }
  },
);

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    // Förstör sessionen
    res.clearCookie("connect.sid"); // Tar bort sessionscookie från användaren
    res.json({ success: true });
  });
});

// GET: Hämta bokningshistorik för en specifik tid (endast för inloggade assistenter)
router.get(
  "/history",
  requireLogin,
  requireRole("assistant"),
  async (req, res) => {
    // Plockar ut de nödvändiga parametrarna från query-strängen
    const { time, date, place, assistant } = req.query;

    // Kollar att alla nödvändiga parametrar finns med
    if (!time || !date || !place || !assistant) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    try {
      // Hämtar historik för den angivna bokningen från modellen/databasen
      const history = await model.getBookingHistoryFor(
        time,
        date,
        place,
        assistant,
      );
      // Skickar historiken som svar
      res.status(200).json(history);
    } catch (err) {
      console.error("Failed to fetch booking history:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

export default router;

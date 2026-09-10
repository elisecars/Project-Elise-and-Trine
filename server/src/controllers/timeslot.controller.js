import express from "express";
import model from "../model.js";
import { requireLogin } from "../middleware.js";

const router = express.Router(); // Skapar en ny router

// GET: Hämta alla tider (bara om inloggad)
router.get("/", requireLogin, async (req, res) => {
  const bookings = await model.getAllBookings(); // Hämta alla tider från modellen
  res.json(bookings);
});

// POST: Reservera en tid
router.post("/reserve", requireLogin, async (req, res) => {
  const { time, assistant, date } = req.body; // Hämtar tid och assistent från klientens förfrågan
  
  // Försöker reservera tiden i databasen och starta timer
  const booking = await model.reserveBooking(
    time,
    assistant,
    date,
    req.app.get("io"), // Skicka med WebSocket så alla klienter kan uppdateras
  ); 

  if (!booking) return res.sendStatus(403);
  res.status(200).json(booking); // Returnera den reserverade tiden
});

// POST: Bekräfta bokning
router.post("/book", requireLogin, async (req, res) => {
  const { time, assistant, studentName, date } = req.body; // Hämtar bokningsdetaljer från användaren
  
  // Försöker boka tiden och avbryter eventuell timer
  const result = await model.bookBooking(
    time,
    assistant,
    studentName,
    date,
    req.app.get("io"),
  ); // Försöker boka tiden och rensa timer

  if (!result) return res.sendStatus(403);

  res.sendStatus(200); // Bekräftar att bokningen lyckades
});

// POST: Avbryt bokning / släpp tid
router.post("/cancel", requireLogin, async (req, res) => {
  const { time, assistant, date } = req.body; // Hämtar information om vilken tid som ska avbokas
  
  // Försök ta bort reservationen från databasen
  const result = await model.cancelReservation(
    time,
    assistant,
    date,
    req.app.get("io"),
  ); // Försöker avboka reservationen i databasen

  // Skicka svar beroende på om det lyckades
  if (result) {
    return res.sendStatus(200);
  }
  return res.sendStatus(400);
});

// POST: Avboka en faktisk bokning
router.post("/cancelBooking", requireLogin, async (req, res) => {
  const { time, assistant, bookedBy } = req.body; // Hämtar info från frontend

  // Försöker ta bort bokningen från databasen och notifierar via WebSocket
  const result = await model.cancelBooking(
    time,
    assistant,
    bookedBy,
    req.app.get("io"),
  ); // Kör riktiga avbokningsfunktionen

  if (!result) {
    return res.sendStatus(400); // Något gick fel, t.ex. ej tillåtet
  }

  res.status(200).json(result); // Skickar tillbaka uppdaterad bokning
});

export default router;

import express from "express";
import model from "../model.js";
import { requireLogin } from "../middleware.js";

const router = express.Router();

// GET: Hämtar alla grupper med tillhörande studentlistor
router.get("/", requireLogin, async (req, res) => {
  try {
    const groups = await model.getAllGroups(); // Returnerar [{ id, name, students: [] }]
    res.json(groups); // Skickar listan till klienten
  } catch (err) {
    console.error("Failed to fetch groups:", err);
    res.status(500).json({ error: "Failed to load groups" });
  }
});

// POST: Låter en användare gå med i en grupp
router.post("/join", requireLogin, async (req, res) => {
  const { groupId, username } = req.body; // Tar emot groupId och användarnamn från klienten

  // Validerar indata
  if (!groupId || !username) {
    return res.status(400).json({ error: "Missing groupId or username" });
  }

  try {
    // Use the model to join the group with the student's name
    const success = await model.joinGroup(groupId, username); // Försöker lägga till användaren i gruppen
    if (!success) {
      return res.status(403).json({ error: "Could not join group" });
    }

    res.status(200).json({ message: "Joined group successfully" });
  } catch (err) {
    console.error("Failed to join group:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST: Skapar en ny grupp med angivet namn
router.post("/create", requireLogin, async (req, res) => {
  const { name } = req.body; // Tar emot gruppnamnet från klienten

  // Validerar att ett giltigt namn skickats in
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Invalid group name" });
  }

  try {
    await model.createGroup(name); // Skapar gruppen i databasen
    res.status(200).json({ message: "Group created" });
  } catch (err) {
    // Hanterar om gruppnamnet redan finns
    if (err.message.includes("UNIQUE constraint failed")) {
      return res.status(400).json({ error: "Group name already exists" });
    }
    console.error("Failed to create group:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

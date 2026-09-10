import express from "express";
import { dbPromise } from "../database.js";
import bcrypt from "bcrypt";
import { body, validationResult } from "express-validator";

const router = express.Router();

// POST: Registrera en ny användare
router.post(
  "/",
  [
    // Validerar och rensar användarnamn
    body("username")
      .trim()
      .escape()
      .notEmpty()
      .withMessage("Username is required")
      .isLength({ max: 50 })
      .withMessage("Username too long"),
    // Validerar lösenordets längd  
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    // Kollar att rollen är giltig
    body("role")
      .isIn(["student", "assistant"])
      .withMessage("Role must be student or assistant"),
  ],
  async (req, res) => {
    // Kollar om det finns valideringsfel
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: errors.array(),
      });
    }

    const { username, password, role } = req.body;

    try {
      const db = await dbPromise;

      // Kollar om användarnamnet redan finns
      const existingUser = await db.get(
        "SELECT * FROM users WHERE username = ?",
        [username],
      );
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Username already exists",
        });
      }

      // Hasha lösenordet
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Lägg till användaren i databasen
      await db.run(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
        [username, hashedPassword, role],
      );

      res.json({ success: true, message: "User registered successfully" });
    } catch (err) {
      console.error("Error during registration:", err);
      res
        .status(500)
        .json({ success: false, message: "Server error during registration" });
    }
  },
);

export default router;

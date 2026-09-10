import sqlite3 from "sqlite3";
import { open } from "sqlite";

// Skapar en promise som öppnar en anslutning till SQLite-databasen
const dbPromise = open({
  filename: "./database.db",
  driver: sqlite3.Database,
});

// Funktion för att initiera och skapa databasen
async function initDatabase() {
  const db = await dbPromise; // Vänta på att ansluta till databasen

  // Skapa tabell för användare (admins)
  // Användare har ett grupp-ID som refererar till en grupp
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      groupId INTEGER,
      role TEXT NOT NULL CHECK (role IN ('student', 'assistant')),
      FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE SET NULL
    )
  `);

  // Skapar tabellen groups där varje grupp har ett unikt namn
  await db.run(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  // Lägg till hårdkodade grupper 1-5
  const groupNames = ["Group 1", "Group 2", "Group 3", "Group 4", "Group 5"];
  for (const groupName of groupNames) {
    await db.run("INSERT OR IGNORE INTO groups (name) VALUES (?)", [groupName]);
  }

  // Skapar tabellen 'drafts' där assistenter kan spara utkast för bokningar
  await db.run(`
    CREATE TABLE IF NOT EXISTS drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assistant TEXT UNIQUE NOT NULL,
      time TEXT,
      date TEXT,
      place TEXT,
      bookingStart TEXT,
      bookingEnd TEXT,
      postBookingDate TEXT,
      examination TEXT,
      cancellationDeadline TEXT,
      additionalTimes TEXT
    )
  `);

  // Skapar tabellen bookings där alla bokningsbara tider sparas
  await db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      time TEXT NOT NULL,
      date TEXT NOT NULL,
      assistant TEXT NOT NULL,
      booked INTEGER DEFAULT 0,
      booked_by TEXT,
      cancelled INTEGER DEFAULT 0,
      cancelled_by TEXT,
      place TEXT,
      bookingStart TEXT,
      bookingEnd TEXT,
      postBookingDate TEXT,
      examination TEXT,
      cancellationDeadline TEXT
    )
  `);

  // Skapar tabellen booking_history för att logga bokningar och avbokningar
  await db.run(`
    CREATE TABLE IF NOT EXISTS booking_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      time TEXT,
      date TEXT,
      place TEXT,
      assistant TEXT,
      action TEXT,
      student TEXT,
      timestamp TEXT
    )
  `);
}

export { dbPromise, initDatabase };

import { dbPromise } from "./database.js";
import Booking from "./models/timeslot.model.js";

// Map för att spara timers för varje aktiv reservation
const reservationTimers = new Map();

const model = {
  // Hämtar alla bokningar från databasen och lägger till senaste historikhändelsen
  async getAllBookings() {
    const db = await dbPromise;
    const rows = await db.all("SELECT * FROM bookings");

    const bookings = [];

    // Loopar igenom varje bokningsrad
    for (const row of rows) {
      // Skapar ett bokningsobjekt från databasraden
      const booking = {
        time: row.time,
        assistant: row.assistant,
        booked: row.booked,
        booked_by: row.booked_by,
        place: row.place,
        date: row.date,
        bookingStart: row.bookingStart,
        bookingEnd: row.bookingEnd,
        postBookingDate: row.postBookingDate,
        examination: row.examination,
        cancelled: row.cancelled,
        cancelled_by: row.cancelled_by,
        cancellationDeadline: row.cancellationDeadline,
      };

      // Lägg till senaste historikhändelsen till varje bokning
      const history = await this.getBookingHistoryFor(
        booking.time,
        booking.date,
        booking.place,
        booking.assistant,
      );

      if (history.length > 0) {
        const latest = history[history.length - 1]; // sista posten = senaste
        booking.latestEntry = {
          student: latest.student,
          action: latest.action,
          timestamp: latest.timestamp,
        };
      }

      // Lägg till bokningen i listan
      bookings.push(booking);
    }

    return bookings;
  },

  // Hämtar alla grupper från databasen tillsammans med tillhörande studenter
  async getAllGroups() {
    const db = await dbPromise;

    // Hämtar alla grupper från tabellen groups, om det inte finns används en hårdkodad lista
    const groups = await db.all("SELECT * FROM groups");
    let allGroups;
      if (groups.length > 0) {
        allGroups = groups;
      } else {
        allGroups = existingGroups;
      }

    // För varje grupp hämtas alla användare vars groupId matchar gruppens id
    for (let group of groups) {
      const students = await db.all(
        "SELECT username FROM users WHERE groupId = ?",
        [group.id],
      );
      // Konverterar resultatet till en array av endast användarnamn
      group.students = students.map((student) => student.username);
    }

    return allGroups;
  },

  // Försöker lägga till en student i en grupp genom att uppdatera user-tabellen
  async joinGroup(groupId, username) {
    const db = await dbPromise;

    try {
      // Uppdaterar groupId för en användare med rollen student
      const result = await db.run(
        "UPDATE users SET groupId = ? WHERE username = ? AND role = 'student'",
        [groupId, username],
      );

      // Om någon rad uppdaterades returneras true, annars false
      if (result.changes > 0) {
        return true; // Användaren lades till i gruppen
      } else {
        return false; // Ingen uppdatering skedde, ex. om användaren inte hittades eller redan tillhör en grupp
      }
    } catch (err) {
      console.error("Error joining group:", err);
      return false;
    }
  },

  // Skapar en ny grupp med angivet namn
  async createGroup(name) {
    const db = await dbPromise;
    await db.run("INSERT INTO groups (name) VALUES (?)", [name]); // Lägger till ny grupp i databasen
  },

  // Spara eller uppdatera ett utkast för en assistent
  async saveDraft(assistant, draftData) {
    const db = await dbPromise;

    // Kollar om ett utkast redan finns för assistenten
    const existing = await db.get("SELECT * FROM drafts WHERE assistant = ?", [
      assistant,
    ]);
    // Serialiserar listan med extra tider till en JSON-sträng innan den sparas
    const additionalTimesJson = JSON.stringify(draftData.additionalTimes || []);

    if (existing) {
      // Om ett utkast redan finns uppdateras det med nya värden
      await db.run(
        `UPDATE drafts SET 
          time = ?, date = ?, place = ?, 
          bookingStart = ?, bookingEnd = ?, postBookingDate = ?,
          examination = ?, cancellationDeadline = ?, additionalTimes = ?
         WHERE assistant = ?`,
        [
          draftData.time,
          draftData.date,
          draftData.place,
          draftData.bookingStart,
          draftData.bookingEnd,
          draftData.postBookingDate,
          draftData.examination,
          draftData.cancellationDeadline,
          additionalTimesJson,
          assistant,
        ],
      );
    } else {
      // Om inget utkast finns skapas ett nytt
      await db.run(
        `INSERT OR REPLACE INTO drafts 
          (assistant, time, date, place, bookingStart, bookingEnd, postBookingDate, examination, cancellationDeadline, additionalTimes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          assistant,
          draftData.time,
          draftData.date,
          draftData.place,
          draftData.bookingStart,
          draftData.bookingEnd,
          draftData.postBookingDate,
          draftData.examination,
          draftData.cancellationDeadline,
          additionalTimesJson,
        ],
      );
    }
  },

  // Hämta ett utkast
  async getDraft(assistant) {
    const db = await dbPromise;

    // Hämtar utkastet för den angivna assistenten från databasen
    const draft = await db.get("SELECT * FROM drafts WHERE assistant = ?", [
      assistant,
    ]);

    // Om det finns ett utkast och det innehåller sparade extra tider i JSON-format
    if (draft && draft.additionalTimes) {
      try {
        // Försök att omvandla JSON-strängen till en JavaScript-array
        draft.additionalTimes = JSON.parse(draft.additionalTimes);
      } catch {
        // Om parsningen misslyckas fallbackar vi till en tom array
        draft.additionalTimes = [];
      }
    }

    return draft;
  },

  // Radera ett utkast
  async clearDraft(assistant) {
    const db = await dbPromise;
    await db.run("DELETE FROM drafts WHERE assistant = ?", [assistant]);
  },

  // INSERT: lägger till en ny rad i bookings-tabellen
  // booked sätts till 0 (ledig), och booked_by till NULL (ingen bokare än)
  async addBooking(
    time,
    assistant,
    place,
    date,
    bookingStart,
    bookingEnd,
    postBookingDate,
    examination,
    cancellationDeadline,
  ) {
    const db = await dbPromise;
    await db.run(
      "INSERT INTO bookings (time, assistant, booked, booked_by, place, date, bookingStart, bookingEnd, postBookingDate, examination, cancellationDeadline) VALUES (?, ?, 0, NULL, ?, ?, ?, ?, ?, ?, ?)",
      [
        time,
        assistant,
        place,
        date,
        bookingStart,
        bookingEnd,
        postBookingDate,
        examination,
        cancellationDeadline,
      ],
    );
  },

  // Tar bort en tid från databasen
  async deleteBooking(
    time,
    assistant,
    place,
    date,
    bookingStart,
    bookingEnd,
    examination,
    cancellationDeadline,
  ) {
    const db = await dbPromise;
    // Tar bort en specifik tid från bookings-tabellen
    await db.run("DELETE FROM bookings WHERE time = ? AND assistant = ?", [
      time,
      assistant,
      place,
      date,
      bookingStart,
      bookingEnd,
      examination,
      cancellationDeadline,
    ]);
  },

  // Uppdatera en befintlig booking
  async editBooking(
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
  ) {
    const db = await dbPromise; // Väntar på att databaskopplingen ska etableras

    // Kontrollera om den nya tiden redan är bokad
    const existingBooking = await db.get(
      "SELECT * FROM bookings WHERE time = ? AND assistant = ?",
      [newTime, assistant],
    );
    if (existingBooking) {
      // Om den nya tiden är bokad, kan vi inte uppdatera
      return null;
    }

    // Uppdaterar den befintliga bokningen med nya värden
    await db.run(
      `UPDATE bookings 
    SET time = ?, place = ?, date = ?, bookingStart = ?, bookingEnd = ?, postBookingDate = ?, examination = ?, cancellationDeadline = ?
    WHERE time = ? AND assistant = ?`,
      [
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
      ],
    );
  },

  // Reserverar en tid
  async reserveBooking(time, assistant, io = null) {
    const db = await dbPromise; // Väntar på att databaskopplingen ska etableras

    // Hämtar en rad från databasen som matchar den specifika tiden och assistenten
    const row = await db.get(
      "SELECT * FROM bookings WHERE time = ? AND assistant = ?",
      [time, assistant],
    );
    if (!row) return null;

    // Skapar ett Booking-objekt från databasen
    const booking = new Booking(
      row.time,
      row.assistant,
      row.booked,
      row.booked_by,
      row.place,
      row.date,
      row.bookingStart,
      row.bookingEnd,
      row.postBookingDate,
      row.examination,
      row.cancelled,
      row.cancelled_by,
      row.cancellationDeadline
    );

    // Försöker reservera bookingen om den är ledig. Om det inte går returneras null
    if (!booking.reserve()) return null;

    // Uppdaterar databasen och sätter status på booking som reserverad
    await db.run(
      "UPDATE bookings SET booked = ? WHERE time = ? AND assistant = ?",
      [booking.booked, time, assistant],
    );

    // Startar en 10s countdown om en io-instans skickas in
    if (io) {
      const key = `${time}-${assistant}`; // Identifierare för denna specifika bokning

      io.emit("booking-reserved", booking);

      // Startar en timer, efter 10 sekunder försöker vi avboka tiden
      const timer = setTimeout(async () => {
        const released = await model.cancelReservation(time, assistant); // Försöker avboka tiden
        if (released) {
          io.emit("booking-released", released); // Meddelar användarna att tiden är släppt
        }
        reservationTimers.delete(key); // Tar bort timern från listan över aktiva timers
      }, 10000);

      reservationTimers.set(key, timer); // Sparar timern för att kunna avbryta den vid behov
    }

    return booking; // Returnerar det uppdaterade booking-objektet
  },

  // Avbryter en reservation och gör en tid tillgänglig igen
  async cancelReservation(time, assistant) {
    const db = await dbPromise; // Väntar på att databaskopplingen ska etableras

    // Hämtar en rad från databasen som matchar angiven tid och assistent
    const row = await db.get(
      "SELECT * FROM bookings WHERE time = ? AND assistant = ?",
      [time, assistant],
    );
    if (!row) return null;

    // Skapar ett booking-objekt från databasen
    const booking = new Booking(
      row.time,
      row.assistant,
      row.booked,
      row.booked_by,
      row.place,
      row.date,
      row.bookingStart,
      row.bookingEnd,
      row.postBookingDate,
      row.examination,
      row.cancelled,
      row.cancelled_by,
      row.cancellationDeadline
    );

    // Försöker avbryta reservationen (sätter status till ledig)
    if (!booking.cancelReservation()) return null; // Om det inte går att avbryta, returnera null

    // Uppdaterar databasen och gör bookingen till ledig (0)
    await db.run(
      "UPDATE bookings SET booked = ?, booked_by = NULL WHERE time = ? AND assistant = ?",
      [booking.booked, time, assistant],
    );

    // Stoppa ev. aktiv timer
    const key = `${time}-${assistant}`;
    if (reservationTimers.has(key)) {
      clearTimeout(reservationTimers.get(key)); // Stoppar timern
      reservationTimers.delete(key); // Tar bort från mappen
    }

    return booking; // Returnerar det uppdaterade booking-objektet
  },

  // Bokar en tid för en student
  async bookBooking(time, assistant, username, io = null) {
    const db = await dbPromise; // Väntar på att databaskopplingen ska etableras

    // --- Begränsar till max 3 aktiva bokningar per student/grupp ---
    
    // Hämta användarens gruppId
    const user = await db.get("SELECT groupId FROM users WHERE username = ?", [
      username,
    ]);

    let identifiers = [];
    if (user?.groupId) {
      // Om användaren tillhör en grupp hämtas alla gruppmedlemmar
      const groupUsers = await db.all(
        "SELECT username FROM users WHERE groupId = ?",
        [user.groupId],
      );
      identifiers = groupUsers.map((u) => u.username);
    } else {
      // Annars hanteras studenten som ensam bokare
      identifiers = [username];
    }

    // Räkna antalet bokningar för gruppen/användaren (status = 1)
    const placeholders = identifiers.map(() => "?").join(", ");
    const bookingCount = await db.get(
      `SELECT COUNT(*) as count FROM bookings WHERE booked_by IN (${placeholders}) AND booked = 1`,
      identifiers,
    );

    // Avbryt om gruppen/studenten redan har 3 aktiva bokningar
    if (bookingCount.count >= 3) {
      console.warn(
        `${user?.groupId ? "Group" : "User"} has already booked 3 times.`,
      );
      await model.cancelReservation(time, assistant); // Släpp ev. reservation
      return null;
    }

    // --- Utför själva bokningen ---

    // Hämtar en rad från databasen som matchar angiven tid och assistent
    const row = await db.get(
      "SELECT * FROM bookings WHERE time = ? AND assistant = ?",
      [time, assistant],
    );
    if (!row) return null;

    // Skapa ett Booking-objekt från databasraden
    const booking = new Booking(
      row.time,
      row.assistant,
      row.booked,
      row.booked_by,
      row.place,
      row.date,
      row.bookingStart,
      row.bookingEnd,
      row.postBookingDate,
      row.examination,
      row.cancelled,
      row.cancelled_by,
      row.cancellationDeadline
    );

    // Försök boka tiden (endast om status === reserverad)
    if (!booking.book(username)) return null;

    // Uppdatera databasen, sätt status till bokad (1) och lagra studentens namn
    await db.run(
      "UPDATE bookings SET booked = ?, booked_by = ? WHERE time = ? AND assistant = ?",
      [booking.booked, booking.booked_by, time, assistant],
    );

    // Om tiden hade en aktiv reservationstimer avbryts den
    const key = `${time}-${assistant}`;
    if (reservationTimers.has(key)) {
      clearTimeout(reservationTimers.get(key));
      reservationTimers.delete(key);
    }

    // Logga bokningen i historiktabellen
    await db.run(
      "INSERT INTO booking_history (time, date, place, assistant, action, student, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        booking.time,
        booking.date,
        booking.place,
        booking.assistant,
        "bokning",
        username,
        new Date().toISOString(), // Tidsstämpel
      ],
    );

    // Skicka live-uppdatering till alla klienter via WebSocket
    if (io) {
      io.emit("booking-booked", booking);
    }

    return booking;
  },

  // Avboka en bokad tid
  async cancelBooking(time, assistant, username, io = null) {
    const db = await dbPromise;

    // Hämtar bokningen som ska avbokas från databasen
    const row = await db.get(
      "SELECT * FROM bookings WHERE time = ? AND assistant = ?",
      [time, assistant],
    );
    if (!row) return null;

    // Skapa ett Booking-objekt från databasraden
    const booking = new Booking(
      row.time,
      row.assistant,
      row.booked,
      row.booked_by,
      row.place,
      row.date,
      row.bookingStart,
      row.bookingEnd,
      row.postBookingDate,
      row.examination,
      row.cancelled,
      row.cancelled_by,
      row.cancellationDeadline
    );

    // --- Kontroll av avbokningsbehörighet ---

    // Tillåt avbokning om användaren själv har bokat
    if (row.booked_by === username) {
      booking.cancelBooking(username);
    } else {
      // Kontrollera grupp-tillhörighet

      // Hämtar gruppId för användaren som försöker avboka
      const user = await db.get(
        "SELECT groupId FROM users WHERE username = ?",
        [username],
      );

      // Hämtar gruppId för användaren som faktiskt bokade tiden
      const bookingUser = await db.get(
        "SELECT groupId FROM users WHERE username = ?",
        [row.booked_by],
      );

      // Avbryt om någon saknar grupp eller tillhör olika grupper
      if (
        !user?.groupId ||
        !bookingUser?.groupId ||
        user.groupId !== bookingUser.groupId
      ) {
        console.warn("Avbokning nekad: olika grupper eller saknar gruppinfo.");
        return null;
      }

      // Om båda tillhör samma grupp tillåts avbokning
      booking.cancelBooking(username);
    }

    // --- Uppdatera databasen ---

    // Uppdatera databasen med de nya värdena från booking-objektet
    await db.run(
      "UPDATE bookings SET booked = ?, booked_by = ?, cancelled = ?, cancelled_by = ? WHERE time = ? AND assistant = ?",
      [
        booking.booked,
        booking.booked_by,
        booking.cancelled,
        booking.cancelled_by,
        time,
        assistant,
      ],
    );

    // Spara historiken i databasen
    await db.run(
      "INSERT INTO booking_history (time, date, place, assistant, action, student, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        booking.time,
        booking.date,
        booking.place,
        booking.assistant,
        "avbokning",
        username,
        new Date().toISOString(),
      ],
    );

    // Skicka live-uppdatering
    if (io) {
      io.emit("booking-cancelled", booking); // Informera alla klienter om att tiden har avbokats
    }

    return booking;
  },

  // Hämtar historik för en specifik bokning baserat på tid, datum, plats och assistent
  async getBookingHistoryFor(time, date, place, assistant) {
    const db = await dbPromise;

    // Hämtar alla historikhändelser för just denna bokning
    // Sorteras efter tidsstämpel i stigande ordning
    const rows = await db.all(
      "SELECT * FROM booking_history WHERE time = ? AND date = ? AND place = ? AND assistant = ? ORDER BY timestamp",
      [time, date, place, assistant],
    );
    return rows; // Returnerar en lista med historikposter
  },
};

export default model;

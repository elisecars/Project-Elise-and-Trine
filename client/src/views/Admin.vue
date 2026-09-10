<template>
  <div>
    <h2>Welcome, {{ username }}</h2>
    <h3>Booking Times</h3>

    <!-- Tabell med alla bokningar för inloggad assistent -->
    <table class="table table-striped table-bordered">
      <thead>
        <tr>
          <th>Date</th>
          <th>Time</th>
          <th>Place</th>
          <th>Booking Start</th>
          <th>Booking End</th>
          <th>Post Booking</th>
          <th>Cancel Deadline</th>
          <th>Examination</th>
          <th>Latest Entry</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <!-- Itererar över filtrerade bokningar -->
        <tr
          v-for="booking in filteredBookings"
          :key="booking.time + booking.date"
        >
          <td>{{ booking.date }}</td>
          <td>{{ booking.time }}</td>
          <td>{{ booking.place }}</td>
          <td>{{ booking.bookingStart }}</td>
          <td>{{ booking.bookingEnd }}</td>
          <td>{{ booking.postBookingDate }}</td>
          <td>{{ booking.cancellationDeadline }}</td>
          <td>{{ booking.examination }}</td>
          <td>
            <!-- Visar vem som senast bokade eller avbokade och när -->
            <div v-if="booking.latestEntry">
              <span>{{ booking.latestEntry.student }}</span>
              <span>
                {{
                  (() => {
                    if (booking.latestEntry.action === "bokning") {
                      return " bokade";
                    } else {
                      return " avbokade";
                    }
                  })()
                }}
              </span>
              <br />
              ({{ new Date(booking.latestEntry.timestamp).toLocaleString() }})
            </div>
          </td>
          <td>
            <!-- Knappar för att redigera eller ta bort bokning -->
            <button type="button" @click="editBooking(booking)">Edit</button>
            <button type="button" @click="deleteBooking(booking)">
              Remove
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Formulär för att lägga till eller redigera en bokning -->
    <div class="new-booking-container">
      <!-- Visar om man redigerar eller skapar en ny bokning -->
      <p>
        <strong v-if="editingBooking">Edit booking:</strong>
        <strong v-else>Add new time:</strong>
      </p>
      <div class="booking-form-wrapper">
        <label for="newDate">Date:</label>
        <input id="newDate" v-model="newDate" type="date" />

        <label for="newTime">Time:</label>
        <input id="newTime" v-model="newTime" type="time" />

        <label for="newPlace">Place:</label>
        <input id="newPlace" v-model="newPlace" type="text" placeholder="Add place" />

        <label for="newBookingStart">Booking start:</label>
        <input id="newBookingStart" v-model="newBookingStart" type="date" />

        <label for="newBookingEnd">Booking end:</label>
        <input id="newBookingEnd" v-model="newBookingEnd" type="date" />

        <label for="newCancellationDeadline">Cancellation deadline:</label>
        <input id="newCancellationDeadline" v-model="newCancellationDeadline" type="date" />

        <label for="newPostBookingDate">Post booking:</label>
        <input id="newPostBookingDate" v-model="newPostBookingDate" type="date" />

        <label for="newExamination">Examination type:</label>
        <input id="newExamination" v-model="newExamination" type="text" />

        <!-- Knapp för att skapa bokningen -->
        <button type="button" @click="submitAllTimes">Submit Booking</button>

        <!-- Knapp för att avbryta en ändring-->
        <button v-if="editingBooking" type="button" @click="cancelEdit">
          Cancel
        </button>

        <!-- Knapp för att lägga till fler tider i samma bokning -->
        <button type="button" @click="addNewTimeRow">Add new time row</button>
      </div>
    </div>

    <!-- Sektion för att kunna lägga till fler tider -->
    <!-- Går igenom varje extra tid i additionalTimes och visar ett fält för att skriva in tid -->
    <div
      v-for="(entry, index) in additionalTimes"
      :key="index + '-' + entry.time"
      class="new-booking-container margin-top"
    >
      <!-- Visar rubrik med numrering för varje extra tid -->
      <p class="bold-text">Additional Time {{ index + 1 }}</p>
      <!-- Inputfält där användaren kan skriva in en tid för den extra bokningen -->
      <label for="entryTime">Time:</label>
      <input id="entryTime" v-model="entry.time" type="time" />
    </div>

    <div v-if="additionalTimes.length > 0" class="margin-top">
      <button type="button" @click="clearAllAdditionalTimes">Clear All</button>
    </div>

    <!-- Utloggningsknapp -->
    <button type="button" class="logout-button" @click="logout">Log out</button>
    <p v-if="msg" class="error-message">{{ msg }}</p>
  </div>
</template>

<script>
import escapeHtml from "../escapeHtml";

export default {
  name: "AdminPage",

  data() {
    return {
      // Temporära variabeler för att lagra inmatade fält
      newTime: "",
      newDate: "",
      newPlace: "",
      newBookingStart: "",
      newBookingEnd: "",
      newPostBookingDate: "",
      newExamination: "",
      newCancellationDeadline: "",
      editingBooking: null,
      additionalTimes: [],
      msg: "",
    };
  },

  computed: {
    // Hämtar användarnamnet från Vuex-store
    username() {
      return this.$store.state.username;
    },

    filteredBookings() {
      // Visar bara tider som tillhör den inloggade assistenten
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Nollställer tid för att jämföra endast datum
      return this.$store.state.bookings
        .filter((booking) => {
          const bookingDate = new Date(booking.date);
          bookingDate.setHours(0, 0, 0, 0);
          // Visa bara framtida tider som tillhör inloggad assistent
          return booking.assistant === this.username && bookingDate >= today;
        })
        .sort((a, b) => {
          // Sorterar först på datum, sen på tid
          if (a.date === b.date) return a.time.localeCompare(b.time);
          return a.date.localeCompare(b.date);
        });
    },
  },

  // Om någon av dessa fält ändras körs saveDraft för att spara utkastet
  watch: {
    newTime: "saveDraft",
    newDate: "saveDraft",
    newPlace: "saveDraft",
    newBookingStart: "saveDraft",
    newBookingEnd: "saveDraft",
    newPostBookingDate: "saveDraft",
    newExamination: "saveDraft",
    newCancellationDeadline: "saveDraft",

    // Övervakar även förändringar i hela listan med tilläggstider. deep: true behövs eftersom det är en array med objekt
    additionalTimes: {
      deep: true,
      handler: "saveDraft",
    },
  },

  // När komponenten laddas
  mounted() {
    this.$store.dispatch("fetchBookings"); // Hämta bokningar från store

    // Hämtar draft från servern via store
    this.$store.dispatch("fetchDraft").then(() => {
      // Plockar ut det sparade utkastet från Vuex
      const d = this.$store.state.draft;

      // Om det finns ett utkast fylls formulärfälten med tidigare sparade värden, annast är fallback tom sträng
      if (d) {
        this.newTime = d.time || "";
        this.newDate = d.date || "";
        this.newPlace = d.place || "";
        this.newBookingStart = d.bookingStart || "";
        this.newBookingEnd = d.bookingEnd || "";
        this.newPostBookingDate = d.postBookingDate || "";
        this.newExamination = d.examination || "";
        this.newCancellationDeadline = d.cancellationDeadline || "";
        this.additionalTimes = d.additionalTimes || [];
      }
    });
  },

  methods: {
    escapeHtml,

    // Metod för att spara nuvarande formulärdata som utkast i Vuex-store
    saveDraft() {
      this.$store.dispatch("saveDraft", {
        time: this.newTime,
        date: this.newDate,
        place: this.newPlace,
        bookingStart: this.newBookingStart,
        bookingEnd: this.newBookingEnd,
        postBookingDate: this.newPostBookingDate,
        examination: this.newExamination,
        cancellationDeadline: this.newCancellationDeadline,
        additionalTimes: this.additionalTimes,
      });
    },

    async submitAllTimes() {
      // Grunddata som delas av alla tider
      const base = {
        date: this.newDate,
        place: this.newPlace,
        bookingStart: this.newBookingStart,
        bookingEnd: this.newBookingEnd,
        postBookingDate: this.newPostBookingDate,
        examination: this.newExamination,
        cancellationDeadline: this.newCancellationDeadline,
      };

      // Skapar en lista med alla tider (huvudtid + ev. extratider)
      const all = [
        { ...base, time: this.newTime },
        ...this.additionalTimes.map((a) => ({ ...base, time: a.time })),
      ].filter((e) => e.time); // Tar bort tomma tider

      // Om vi redigerar en befintlig bokning tas den gamla bort först
      if (this.editingBooking) {
        // Skickar DELETE till servern för att ta bort den gamla bokningen
        await fetch("https://127.0.0.1:8989/api/admin", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            time: this.editingBooking.time,
            assistant: this.username,
          }),
        });
        this.editingBooking = null; // Avslutar redigeringsläget
      }
      
      // Skickar alla tider till servern som nya POST-anrop. Använder Promise.all för att skicka dem parallellt
      await Promise.all(
        all.map((entry) =>
          fetch("https://127.0.0.1:8989/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ ...entry, assistant: this.username }),
          }),
        ),
      );

      // Uppdaterar bokningslistan från servern
      await this.$store.dispatch("fetchBookings");

      // Rensar ev. sparat utkast
      await this.$store.dispatch("clearDraft");

      // Tömmer formuläret och ev. extratider
      this.clearForm();
      this.clearAllAdditionalTimes();
    },

    // Tömmer alla formulärfält
    clearForm() {
      this.newTime = "";
      this.newDate = "";
      this.newPlace = "";
      this.newBookingStart = "";
      this.newBookingEnd = "";
      this.newPostBookingDate = "";
      this.newExamination = "";
      this.newCancellationDeadline = "";
    },

    // Fyller i formuläret med värden från en bokning (för redigering)
    editBooking(booking) {
      this.newTime = booking.time;
      this.newDate = booking.date;
      this.newPlace = booking.place;
      this.newBookingStart = booking.bookingStart;
      this.newBookingEnd = booking.bookingEnd;
      this.newPostBookingDate = booking.postBookingDate;
      this.newExamination = booking.examination;
      this.newCancellationDeadline = booking.cancellationDeadline;
      this.editingBooking = booking; // Markerar att vi redigerar en tid
    },

    // Avbryter redigering och rensar formuläret
    cancelEdit() {
      this.editingBooking = null;
      this.clearForm();
    },

    async deleteBooking(booking) {
      // Skickar en DELETE-request till servern för att ta bort en bokning
      await fetch("https://127.0.0.1:8989/api/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ time: booking.time, assistant: this.username }),
      });
      await this.$store.dispatch("fetchBookings"); // Uppdaterar bokningslistan efter borttagning
    },

    // Lägger till en ny tom tid i listan med extra tider
    addNewTimeRow() {
      this.additionalTimes.push({ time: "" });
    },

    // Tömmer listan med extra tider
    clearAllAdditionalTimes() {
      this.additionalTimes = [];
    },

    async logout() {
      // Skickar en POST-request till servern för att logga ut
      await fetch("https://127.0.0.1:8989/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });

      // Rensar inloggningsstatus och användarnamn i Vuex-store
      this.$store.commit("setAuthenticated", false);
      this.$store.commit("setUsername", "");

      // Skickar användaren till inloggningssidan
      this.$router.push("/login");
    },
  },
};
</script>

<style>
.logout-button {
  margin-top: 20px;
}

.error-message {
  color: red;
  margin-top: 10px;
}

.new-booking-container {
  border: 1px solid #080707;
  padding: 1rem;
  margin-top: 1.5rem;
  border-radius: 8px;
  background-color: #dbf1fe;
}

.booking-form-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}

.margin-top {
  margin-top: 1rem;
}

table {
  margin-top: 1rem;
  width: 100%;
  border-collapse: collapse;
}

.bold-text {
  font-weight: bold;
}
</style>

<template>
  <div>
    <h2>Booking Times</h2>

    <!-- Lista över alla bokningsbara tider -->
    <ul>
      <li
        v-for="booking in sortedBookings"
        :key="
          booking.time +
          booking.assistant +
          booking.date +
          booking.place +
          booking.examination
        "
        :class="{
          booked: booking.booked_by,
          reserved: booking.booked === 2,
          cancelled: booking.cancelled === 1,
        }"
      >
        <!-- Visar information om tiden -->
        <span>
          {{ escapeHtml(formatBookingText(booking)) }}
        </span>

        <!-- Visar vem som bokat samt möjlighet att avboka -->
        <span v-if="booking.booked_by" class="booked-text-with-cancel">
          Booked by: {{ booking.booked_by }}
          <button
            type="button"
            :disabled="!isBookable(booking) || !canCancelBooking(booking)"
            class="cancel-inline-button"
            @click="cancelBooking(booking)"
          >
            Cancel
          </button>
        </span>

        <!-- Visar om tiden är reserverad -->
        <span v-else-if="booking.booked === 2" class="reserved-text">
          Reserved
        </span>

        <!-- Visar bokningsknapp om tiden är ledig -->
        <span v-if="!booking.booked_by && booking.booked !== 2">
          <button
            type="button"
            :disabled="!isBookable(booking)"
            @click="goToBooking(booking)"
          >
            Book
          </button>
          <!-- Visar info om bokningsperioden om tiden inte går att boka -->
          <span v-if="getBookingPeriodText(booking)" class="booking-warning">
            {{ getBookingPeriodText(booking) }}
          </span>
        </span>
      </li>
    </ul>

    <div v-if="sortedBookings.length === 0">
      Inga tider tillgängliga just nu.
    </div>

    <p v-if="msg" class="error-message">{{ msg }}</p>

    <!-- Logga ut-knapp -->
    <button type="button" class="logout-button" @click="logout">Log out</button>
  </div>
</template>

<script>
import { mapState } from "vuex";
import escapeHtml from "../escapeHtml";

export default {
  name: "ShowBookingsView",

  data() {
    return {
      msg: "",
    };
  },

  computed: {
    ...mapState(["bookings", "username"]), // Mappar Vuex state till komponenten

    // Filtrerar och sorterar tider att visa
    sortedBookings() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return this.bookings
        .filter((booking) => {
          // Skapar datumobjekt för bokningsdatumet och postningsdatumet
          const bookingDate = new Date(booking.date);
          bookingDate.setHours(0, 0, 0, 0);

          const postDate = new Date(booking.postBookingDate || booking.date);
          postDate.setHours(0, 0, 0, 0);
          
          // Visa obokade tider om bokningsdatum är i framtiden och de är postade
          return (
            bookingDate >= today && postDate <= today
          );
        })
        .sort((a, b) => {
          // Sortera på datum först, sedan tid
          if (a.date === b.date) return a.time.localeCompare(b.time);
          return a.date.localeCompare(b.date);
        });
    },
  },

  mounted() {
    // Hämtar bokningsdata från store när komponenten laddas
    this.$store.dispatch("fetchBookings");
  },

  methods: {
    escapeHtml,
    
    // Formaterar datum
    formatDate(date) {
      const parsedDate = new Date(date);
      const options = { year: "numeric", month: "long", day: "numeric" };
      return parsedDate.toLocaleDateString(undefined, options);
    },

    // Sträng för bokning
    formatBookingText(booking) {
      return `${this.formatDate(booking.date)} - ${booking.time} → ${booking.place} - ${booking.examination} with ${booking.assistant}. (Cancel before: ${booking.cancellationDeadline}).`;
    },

    // Returnerar true om dagens datum är inom bokningsperioden
    isBookable(booking) {
      const today = new Date();
      const start = new Date(booking.bookingStart);
      const end = new Date(booking.bookingEnd);
      return today >= start && today <= end;
    },

    // Returnerar ett meddelande om bokningen inte öppnat eller redan är stängd
    getBookingPeriodText(booking) {
      const today = new Date();
      const start = new Date(booking.bookingStart);
      const end = new Date(booking.bookingEnd);

      if (today < start) return `Booking opens ${start.toLocaleDateString()}.`;
      if (today > end) return `Booking closed ${end.toLocaleDateString()}.`;
      return "";
    },

    goToBooking(booking) {
      // Hämtar grupper, bokningar och användarnamn från Vuex
      const { groups, bookings, username } = this.$store.state;
      
      // Hittar gruppen som användaren tillhör (om någon)
      const userGroup = groups.find((group) =>
        group.students.includes(username),
      );

      let bookingCount = 0;

      if (userGroup) {
        // Om användaren tillhör en grupp räknas antal bokningar för hela gruppen
        const groupUsers = userGroup.students;
        groupUsers.forEach((user) => {
          bookingCount += bookings.filter(
            (b) => b.booked_by === user && b.booked === 1,
          ).length;
        });
      } else {
        // Om användaren inte är i en grupp räknas endast personens egna bokningar
        bookingCount = bookings.filter(
          (b) => b.booked_by === username && b.booked === 1,
        ).length;
      }
      // Visar felmeddelande med antalet bokningar > 3
      if (bookingCount >= 3) {
        this.msg = userGroup
        if (userGroup) {
          this.msg = "Your group has already booked 3 times.";
        } else {
          this.msg = "You have already booked 3 times.";
        }
        setTimeout(() => {
          this.msg = ""; // Rensa meddelandet efter 5 sekunder
        }, 5000);
        return;
      }

      // Annars sätts vald bokning och vi går vidare till bokningsvyn
      this.$store.commit("setSelectedBooking", booking);
      this.$router.push("/booking");
    },

    canCancelBooking(booking) {
      const now = new Date(); // Hämtar nuvarande tidpunkt

      if (!booking.cancellationDeadline) return true; // Om det inte finns någon avbokningsgräns tillåts avbokning

      const deadline = new Date(booking.cancellationDeadline); // Skapar ett Date-objekt från avbokningsgränsen
      const isBeforeDeadline = now < deadline; // Kollar om det fortfarande går att avboka

      // Om den inloggade användaren själv har bokat tiden och det är innan deadline → tillåt avbokning
      if (booking.booked_by === this.username && isBeforeDeadline) return true;

      const { groups } = this.$store.state; // Hämtar grupper från store

      // Hittar id för den grupp användaren tillhör (om någon)
      const userGroupId = groups.find(({ students }) =>
        students.includes(this.username),
      )?.id;

      // Hittar id för gruppen som bokat tiden (om någon)
      const bookedByGroupId = groups.find(({ students }) =>
        students.includes(booking.booked_by),
      )?.id;

      // Tillåt avbokning om det är samma grupp och vi är före deadline
      return userGroupId === bookedByGroupId && isBeforeDeadline;
    },

    async cancelBooking(booking) {
      const bookingData = {
        time: booking.time,
        assistant: booking.assistant,
        bookedBy: this.username,
      };

      // Returnerar en Promise som avslutas när servern bekräftar avbokningen
      return new Promise((resolve) => {
        const { socket } = this.$store.state; // Hämtar WebSocket-anslutningen från store

        // Definierar en lyssnare för händelsen booking-cancelled
        const handler = (updatedBooking) => {
          // Säkerställer att rätt bokning uppdaterats
          if (
            updatedBooking.time === booking.time &&
            updatedBooking.assistant === booking.assistant
          ) {
            socket.off("booking-cancelled", handler); // Tar bort lyssnaren efter att den använts
            resolve(); // Avslutar promise
          }
        };

         // Aktiverar lyssnaren för händelsen "booking-cancelled"
        socket.on("booking-cancelled", handler);

        // Skickar avbokningsförfrågan till servern via WebSocket
        this.$store.dispatch("cancelBooking", bookingData);
      })
      // När servern bekräftat att bokningen är avbokad uppdateras listan med bokningar
      .then(() => this.$store.dispatch("fetchBookings"));
    },

    async logout() {
      // Skickar POST-request till servern för att logga ut användaren
      await fetch("https://127.0.0.1:8989/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });

      // Markerar att användaren är utloggad i Vuex-store
      this.$store.commit("setAuthenticated", false);
      this.$store.commit("setUsername", ""); // Rensar användarnamn
      this.$router.push("/login"); // Skickar användaren till inloggningssida
    },
  },
};
</script>

<style>
.booked {
  color: red;
}

.reserved {
  color: gray;
}

.booked-text,
.reserved-text {
  display: block;
  font-style: italic;
}

.booking-warning {
  color: #777;
  font-style: italic;
  margin-top: 0.3rem;
}

.booked-text-with-cancel {
  display: inline-block;
  margin-top: 0.3rem;
  font-style: italic;
}

.cancel-inline-button {
  margin-left: 0.5rem;
  font-size: 0.9rem;
  padding: 0.2rem 0.5rem;
}

.error-message {
  color: red;
  font-weight: bold;
  margin-top: 1rem;
}
</style>

<template>
  <div>
    <!-- Visar vilken assistent som ansvarar för tiden -->
    <h2>{{ escapeHtml(`Assistant: ${selectedBooking.assistant}`) }}</h2>
    <h3>{{ escapeHtml(`Time: ${selectedBooking.time}`) }}</h3>

    <!-- Nedräkning för att slutföra bokningen -->
    <p v-if="countdown > 0" class="countdown-text">
      You have {{ countdown }} seconds to complete your booking.
    </p>
    <p v-else class="countdown-expired">Time expired! Redirecting...</p>

    <!-- Bokningsknapp som inaktiveras om slotten är bokad eller utanför bokningsspannet -->
    <div>
      <button
        type="button"
        :disabled="isBookingBooked || !isWithinBookingPeriod"
        @click="confirmBooking"
      >
        <span v-if="isBookingBooked">Booked</span>
        <span v-else>Book</span>
      </button>

      <!-- Avbryt bokningen -->
      <button type="button" @click="cancelReservation">Cancel Booking</button>
    </div>

    <!-- Meddelande om tiden är utanför bokningsspannet -->
    <p v-if="!isWithinBookingPeriod" class="text-warning">
      Bokning öppnar den {{ formattedBookingStart }}.
    </p>

    <!-- Visar felmeddelanden -->
    <p v-if="msg" class="text-danger">{{ escapeHtml(msg) }}</p>
  </div>
</template>

<script>
import escapeHtml from "../escapeHtml";

export default {
  name: "BookingView",

  data() {
    return {
      msg: "",
      countdown: 10,
      timer: null,
    };
  },

  computed: {
    // Formaterar startdatumet för bokningen till läsbar text
    formattedBookingStart() {
      if (!this.selectedBooking.bookingStart) return "";
      const date = new Date(this.selectedBooking.bookingStart);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },

    // Kollar om dagens datum ligger inom bokningsperioden
    isWithinBookingPeriod() {
      const today = new Date();
      const start = new Date(this.selectedBooking.bookingStart);
      const end = new Date(this.selectedBooking.bookingEnd);
      return today >= start && today <= end;
    },

    // Hämtar vald tid
    selectedBooking() {
      return this.$store.state.selectedBooking;
    },

    // Returnerar true om tiden redan är bokad
    isBookingBooked() {
      return this.selectedBooking.booked === 1;
    },

    // Hämtar användarnamnet
    username() {
      return this.$store.state.username;
    },
  },

  watch: {
    // Övervakar vem som bokat tiden och visar meddelande om någon har bokat
    "selectedBooking.booked_by": function handleBookedByChange(newVal) {
      if (newVal) {
        this.msg = `Booked by ${newVal}`;
      }
    },
  },

  created() {
    // När komponenten skapas reserveras tiden och nedräkningen startas
    this.reserveBooking();
    this.startCountdown();
  },

  beforeUnmount() {
    // Rensar timern när komponenten tas bort
    clearInterval(this.timer);
  },

  methods: {
    escapeHtml,

    // Bekräfta bokning genom att skicka studentens namn och tid-info
    confirmBooking() {
      const bookingData = {
        time: this.selectedBooking.time,
        assistant: this.selectedBooking.assistant,
        bookedBy: this.username,
      };

      this.$store.dispatch("bookBooking", bookingData); // Skickar bokningsförfrågan till index/store.js
      clearInterval(this.timer); // Stoppa nedräkningen
      this.$router.push("/showtimeslots"); // Skicka tillbaka till tidslistan
    },

    // Avbryt bokningen
    cancelReservation() {
      const bookingData = {
        time: this.selectedBooking.time,
        assistant: this.selectedBooking.assistant,
      };

      this.$store.dispatch("cancelReservation", bookingData); // Skickar avbokning via Vuex
      clearInterval(this.timer); // Stoppa nedräkningen
      this.$router.push("/showtimeslots"); // Återgå till tidslistan
    },

    // Starta en nedräkning när sidan laddas
    startCountdown() {
      this.timer = setInterval(() => {
        if (this.countdown > 0) {
          this.countdown -= 1;
        } else {
          clearInterval(this.timer); // Stoppa när tiden är slut
          this.$router.push("/showtimeslots"); // Omdirigera vid utgången tid
        }
      }, 1000);
    },

    // Reserverar vald tid temporärt via Vuex och WebSocket
    reserveBooking() {
      const bookingData = {
        time: this.selectedBooking.time,
        assistant: this.selectedBooking.assistant,
      };
      this.$store.dispatch("reserveBooking", bookingData); // Skickar reservationsförfrågan
    },
  },
};
</script>

<style>
button {
  margin: 5px;
}

.booked {
  color: red;
}

.booked-text {
  display: block;
  color: red;
}
</style>

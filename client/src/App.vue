<template>
  <!-- Navigeringsmeny med länkar till Login, Tider och Admin-sidan -->
  <nav class="navbar navbar-expand-md navbar-dark bg-dark">
    <!-- Knapp för att visa/dölja menyn på små skärmar -->
    <button
      class="navbar-toggler mx-2 mb-2"
      type="button"
      data-bs-toggle="collapse"
      data-bs-target="#navbarNav"
    >
      <span class="navbar-toggler-icon"></span>
    </button>
    
    <!-- Menyalternativ som visas när menyn är expanderad -->
    <div id="navbarNav" class="collapse navbar-collapse mx-2">
      <ul class="navbar-nav">
        <!-- Länk till inloggningssidan -->
        <li v-if="!isAuthenticated" class="nav-item">
          <a class="nav-link" href="#" @click="redirect('/login')">Login</a>
        </li>
        <!-- Länk till sidan som visar tillgängliga tider -->
        <li v-if="isAuthenticated" class="nav-item">
          <a class="nav-link" href="#" @click="redirect('/showtimeslots')"
            >Times</a
          >
        </li>
        <!-- Länk till admin-sidan -->
        <li v-if="isAuthenticated && isAssistant" class="nav-item">
          <a class="nav-link" href="#" @click="redirect('/admin')"
            >Admin Page</a
          >
        </li>
        <!-- Länk till grupphantering -->
        <li v-if="isAuthenticated && isStudent" class="nav-item">
          <a class="nav-link" href="#" @click="redirect('/groups')"
            >Join Group</a
          >
        </li>
        <!-- Länk till policy-sidan -->
        <li v-if="isAuthenticated" class="nav-item">
          <a class="nav-link" href="#" @click="redirect('/policy')">Policy</a>
        </li>
      </ul>

      <!-- Visar användarnamn och roll -->
      <div v-if="isAuthenticated" class="ms-auto text-light me-3">
        {{ username }} ({{ userRole }})
      </div>
    </div>
  </nav>

  <!-- Huvudsektionen där sidans innehåll visas beroende på routing -->
  <section class="container-fluid py-4">
    <router-view />
  </section>
</template>

<script>
import "bootstrap";

let activityTimeout;
let pollingInterval;

export default {
  computed: {
    // Hämtar autentiseringstillstånd från Vuex store
    isAuthenticated() {
      return this.$store.state.authenticated;
    },
    isAssistant() {
      return this.$store.state.role === "assistant";
    },
    isStudent() {
      return this.$store.state.role === "student";
    },
    username() {
      return this.$store.state.username;
    },
    userRole() {
      return this.$store.state.role;
    },
  },

  async mounted() {
    // Kollar om det redan finns en aktiv session
    await this.$store.dispatch("checkSession");

    // Aktiverar WebSocket-lyssnare
    this.$store.dispatch("setupSocketListeners");

    // Startar inaktivitetsövervakning
    this.startActivityWatcher();

    // Startar polling för att hålla koll på sessionens status
    this.startPolling();
  },

  beforeUnmount() {
    // Rensar timers och lyssnare när komponenten tas bort
    clearTimeout(activityTimeout);
    clearInterval(pollingInterval);
    window.removeEventListener("mousemove", this.resetTimer);
    window.removeEventListener("keydown", this.resetTimer);
    window.removeEventListener("click", this.resetTimer);
    window.removeEventListener("input", this.resetTimer);
  },

  methods: {
    // Navigerar till vald path
    redirect(target) {
      this.$router.push(target);
    },

    /* Nytt för att hantera session timeout */
    // Startar timer som loggar ut användaren efter inaktivitet
    startActivityWatcher() {
      this.resetTimer = () => {
        clearTimeout(activityTimeout);
        activityTimeout = setTimeout(this.logoutDueToInactivity, 30*60000);
      };

      // Lyssnar efter aktivitet i fönstret
      window.addEventListener("mousemove", this.resetTimer);
      window.addEventListener("keydown", this.resetTimer);
      window.addEventListener("click", this.resetTimer);
      window.addEventListener("input", this.resetTimer);

      this.resetTimer(); // Starta direkt vid montering
    },

    // Loggar ut användaren efter inaktivitet
    async logoutDueToInactivity() {
      console.log("Inaktivitet upptäckt, loggar ut...");
      await fetch("https://127.0.0.1:8989/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });

      this.$store.commit("setAuthenticated", false);
      this.$store.commit("setUsername", "");
      this.$router.push("/login");
    },

    // Kontinuerlig kontroll av sessionens status genom check-session var 5:e sekund
    startPolling() {
      pollingInterval = setInterval(async () => {
        try {
          const response = await fetch(
            "https://127.0.0.1:8989/api/admin/check-session",
            {
              credentials: "include",
            },
          );
          const data = await response.json();

          if (!data.authenticated) {
            console.log("Sessionen är ogiltig (polling). Loggar ut...");
            clearInterval(pollingInterval);
            this.$store.commit("setAuthenticated", false);
            this.$store.commit("setUsername", "");
            this.$router.push("/login");
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 5000); // Poll varje 5:e sekund
    },
  },
};
</script>

<style>
@import url("bootstrap/dist/css/bootstrap.css");

html,
body {
  background-color: #c6e7fb;
}
</style>

<template>
  <div class="row">
    <div class="col"></div>

    <!-- Registreringsformulär -->
    <form class="col" @submit.prevent="register">
      <h3 class="mb-3">Register an account</h3>

      <!-- Fält för användarnamn -->
      <label class="form-label" for="username">Username</label>
      <input
        id="username"
        v-model="username"
        type="text"
        class="form-control"
        required
      />

      <!-- Fält för lösenord -->
      <label class="form-label mt-3" for="password">Password</label>
      <input
        id="password"
        v-model="password"
        type="password"
        class="form-control"
        required
      />

      <!-- Välj roll (student eller asse) -->
      <label class="form-label mt-3" for="role">Role</label>
      <select id="role" v-model="role" class="form-select" required>
        <option value="" disabled selected>Choose role</option>
        <option value="student">Student</option>
        <option value="assistant">Assistant</option>
      </select>

      <ul v-if="validationErrors.length" class="error-message mt-3">
        <li v-for="(err, index) in validationErrors" :key="index">
          {{ escapeHtml(err) }}
        </li>
      </ul>
      <p v-if="msg && !validationErrors.length" class="error-message">
        {{ escapeHtml(msg) }}
      </p>

      <!-- Submit-knapp för att registrera -->
      <button type="submit" class="btn btn-success mt-4 float-end">
        Register
      </button>
    </form>

    <div class="col"></div>
  </div>
</template>

<script>
import escapeHtml from "../escapeHtml";

export default {
  name: "RegisterView",
  data() {
    return {
      username: "",
      password: "",
      role: "",
      msg: "",
      validationErrors: [],
    };
  },
  methods: {
    escapeHtml,

    async register() {
      try {
        // Skickar en POST-förfrågan till servern för att registrera ny användare
        const res = await fetch("https://127.0.0.1:8989/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: this.username,
            password: this.password,
            role: this.role,
          }),
        });

        const data = await res.json();

        // Rensar tidigare felmeddelanden
        this.validationErrors = [];
        this.msg = "";

        // Om registrering lyckades loggas användaren in direkt
        if (data.success) {
          await this.checkLogin();
          return;
        }

        if (data.errors) {
          this.validationErrors = data.errors.map((e) => e.msg);
        } else {
          this.msg = data.message || "Registration failed.";
        }
      } catch (err) {
        console.error(err);
        this.msg = "Server error during registration.";
      }
    },

    async checkLogin() {
      try {
        // Skickar en POST-förfrågan till servern för att logga in användaren
        const response = await fetch("https://127.0.0.1:8989/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: this.username,
            password: this.password,
          }),
          credentials: "include",
        });

        const data = await response.json();

        if (data.success) {
          // Om inloggningen lyckades uppdateras Vuex-store med användarens data
          this.$store.commit("setAuthenticated", true);
          this.$store.commit("setUsername", this.username);
          this.$store.commit("setRole", data.role);

          // Skickar användaren till rätt vy beroende på roll
          if (data.role === "assistant") {
            this.$router.push("/admin");
          } else {
            this.$router.push("/showtimeslots");
          }
        } else {
          this.msg = "Login failed!";
        }
      } catch (error) {
        console.error(error);
        this.msg = "Server error. Please try again.";
      }
    },
  },
};
</script>

<style>
.error-message {
  color: red;
}
</style>

<template>
  <div class="row">
    <div class="col"></div>

    <!-- Inloggningsformulär -->
    <form class="col" @submit.prevent="checkLogin">
      <!-- Fält för användarnamn -->
      <label for="username" class="form-label h4">Username</label>
      <input v-model="username" type="text" class="form-control" required />

      <!-- Fält för lösenord -->
      <label for="password" class="form-label h4 mt-3">Password</label>
      <input v-model="password" type="password" class="form-control" required />

      <!-- Felmeddelande vid misslyckad inloggning -->
      <p v-if="msg" class="error-message">{{ escapeHtml(msg) }}</p>

      <!-- Inloggningsknapp -->
      <button type="submit" class="btn btn-dark mt-4 float-end">Log in</button>

      <!-- Länk till registrering -->
      <p class="mt-5">
        Don't have an account?
        <a href="#" @click.prevent="$router.push('/register')">Register here</a>
      </p>
    </form>
    <div class="col"></div>
  </div>
</template>

<script>
import escapeHtml from "../escapeHtml";

export default {
  name: "LoginPage",

  data() {
    // Lagrar användarnamn, lösenord och visar felmeddelande om inloggning misslyckas
    return { username: "", password: "", msg: "" };
  },

  methods: {
    escapeHtml,

    async checkLogin() {
      try {
        // Försöker logga in användaren genom att skicka en POST-förfrågan till servern
        const response = await fetch("https://127.0.0.1:8989/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: this.username,
            password: this.password,
          }), // Skickar användarnamn och lösenord
          credentials: "include",
        });

        const data = await response.json();

        if (data.success) {
          // Om inloggningen lyckas sparas inloggningsdata i store
          this.$store.commit("setAuthenticated", true);
          this.$store.commit("setUsername", this.username);
          this.$store.commit("setRole", data.role);

          // Skickar användaren till rätt sida beroende på roll
          if (data.role === "assistant") {
            this.$router.push("/admin");
          } else if (data.role === "student") {
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

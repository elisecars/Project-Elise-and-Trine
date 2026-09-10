import { createRouter, createWebHistory } from "vue-router";
import Login from "../views/Login.vue";
import Register from "../views/Register.vue";
import Admin from "../views/Admin.vue";
import ShowTimeslots from "../views/ShowTimeslots.vue";
import Booking from "../views/Booking.vue";
import Groups from "../views/Groups.vue";
import Policy from "../views/Policy.vue";

// Definierar en lista med routes och kopplar varje URL-sökväg till en specifik komponent
const routes = [
  { path: "/", redirect: "/login" },
  { path: "/login", component: Login },
  { path: "/register", component: Register },
  { path: "/admin", component: Admin },
  { path: "/showtimeslots", component: ShowTimeslots },
  { path: "/booking", component: Booking },
  { path: "/groups", component: Groups },
  { path: "/policy", component: Policy },
];

// Skapar en routerinstans
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // Sätter bas-URL
  routes, // Använder de definierade routsen
});

// Exporterar routern så att den kan användas i huvudapplikationen
// Vue Router kommer då att kontrollera vilken URL användaren är på och visa rätt komponent.
export default router;

import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";

// Initierar WebSocket-listeners för att lyssna på realtidsuppdateringar från servern
store.dispatch("setupSocketListeners");

// Skapar och monterar Vue-applikationen, kopplar samman Vuex och router
createApp(App).use(store).use(router).mount("#app");

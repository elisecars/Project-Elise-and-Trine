import { createStore } from "vuex"; // Vuex för att skapa en global store
import { io } from "socket.io-client"; // Socket.IO-klienten för realtidskommunikation

// Skapar en socket.io-klientanslutning med authentisering
const socket = io("https://127.0.0.1:8989", { withCredentials: true });

// Skapar och exporterar Vuex-store
export default createStore({
  // State: Globala tillståndsvariabler
  state: {
    authenticated: false,
    username: "",
    selectedBooking: "",
    role: "",
    place: "",
    bookingStart: "",
    bookingEnd: "",
    postBookingDate: "",
    examination: "",
    bookings: [],
    groups: [],
    cancellationDeadline: "",
    draft: null,
    socket,
  },

  // Mutations: Ändrar state-variabler synkront
  mutations: {
    setAuthenticated(state, authenticated) {
      state.authenticated = authenticated;
    },
    setRole(state, role) {
      state.role = role;
    },
    setUsername(state, username) {
      state.username = username;
    },
    setDraft(state, draft) {
      state.draft = draft;
    },
    clearDraft(state) {
      state.draft = null;
    },
    setPlace(state, place) {
      state.place = place;
    },
    setBookingStart(state, bookingStart) {
      state.bookingStart = bookingStart;
    },
    setBookingEnd(state, bookingEnd) {
      state.bookingEnd = bookingEnd;
    },
    setPostBookingDate(state, postBookingDate){
      state.postBookingDate = postBookingDate;
    },
    setExamination(state, examination) {
      state.examination = examination;
    },
    setCancellationDeadline(state, deadline) {
      state.cancellationDeadline = deadline;
    },
    setGroups(state, groups) {
      state.groups = groups;
    },
    setBookings(state, bookings) {
      state.bookings = bookings;
    },
    setSelectedBooking(state, selectedBooking) {
      state.selectedBooking = selectedBooking;
    },
    addStudentToGroup(state, { groupId, username }) {
      const group = state.groups.find((g) => g.id === groupId); // Hitta gruppen med rätt ID
      
      // Lägg till student i gruppen
      if (group) {
        group.students.push(username);
      }
    },
    updateBookingStatus(state, updatedBooking) {
      // Hitta bokningen i listan som matchar tid och assistent
      const index = state.bookings.findIndex(
        (booking) =>
          booking.time === updatedBooking.time &&
          booking.assistant === updatedBooking.assistant,
      );
      // Om tiden hittas i listan, ersätt den med den nya informationen
      if (index !== -1) {
        state.bookings[index] = updatedBooking;
      }
    },
  },

  // Actions: Asynkrona funktioner som kan anropa mutationer
  actions: {
    // Kontrollerar om en session finns på servern och uppdaterar inloggningsstatus
    async checkSession({ commit }) {
      try {
        // Skickar en request till servern för att kolla om användaren är inloggad
        const response = await fetch(
          "https://127.0.0.1:8989/api/admin/check-session",
          { credentials: "include" }, // Skickar med cookies för autentisering
        );
        const data = await response.json(); // Läs svaret som JSON

        if (data.authenticated) {
          // Uppdatera state med att användaren är inloggad
          commit("setAuthenticated", true);
          commit("setUsername", data.username);
          commit("setRole", data.role);
        } else {
          // Annars sätts användaren är utloggad, och nollställs
          commit("setAuthenticated", false); // Markera användaren som utloggad
          commit("setUsername", "");
          commit("setRole", "");
        }
      } catch {
        commit("setAuthenticated", false); // Markera som utloggad om något går fel
        commit("setUsername", "");
        commit("setRole", "");
      }
    },

    // Hämtar sparat utkast från servern
    async fetchDraft({ commit }) {
      const response = await fetch("https://127.0.0.1:8989/api/admin/draft", {
        credentials: "include",
      });
      // Tolkar svaret som JSON och sparar utkastet i store
      if (response.ok) {
        const draft = await response.json();
        commit("setDraft", draft); 
      }
    },

    // Sparar ett nytt eller uppdaterat utkast till servern
    async saveDraft(_, draftData) {
      await fetch("https://127.0.0.1:8989/api/admin/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(draftData),
      });
    },

    // Tar bort/rensar ett utkast från servern och uppdaterar store
    async clearDraft({ commit }) {
      await fetch("https://127.0.0.1:8989/api/admin/draft", {
        method: "DELETE",
        credentials: "include",
      });
      commit("clearDraft"); // Tar bort utkastet från Vuex-store
    },

    // Hämtar alla tillgängliga bokningstider från servern och sparar dem i store
    async fetchBookings({ commit }) {
      const response = await fetch("https://127.0.0.1:8989/api/bookings", {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      commit("setBookings", data); // Sparar bokningarna i Vuex-store
    },

    // Hämtar alla grupper från servern och sparar dem i store
    async fetchGroups({ commit }) {
      const response = await fetch("https://127.0.0.1:8989/api/groups", {
        credentials: "include",
      });
      const data = await response.json();
      commit("setGroups", data); // Sparar grupperna i Vuex store
    },

    // Skickar en begäran om att gå med i en grupp och uppdaterar store om det lyckas
    async joinGroup({ commit }, { groupId, username }) {
      const response = await fetch("https://127.0.0.1:8989/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, groupId }),
      });

      // Om OK uppdateras store genom att lägga till användaren i gruppen
      if (response.ok) {
        commit("addStudentToGroup", { groupId, username });
      }
      return response.ok;
    },

    // Skickar en begäran om att skapa en grupp och lägger till den i store
    async createGroup({ commit, state }, groupName) {
      const response = await fetch("https://127.0.0.1:8989/api/groups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: groupName }),
      });

      if (response.ok) {
        const newGroup = await response.json(); // Hämtar nya gruppens data
        commit("setGroups", [...state.groups, newGroup]); // Lägger till den nya gruppen i listan i store
      }
      return response.ok;
    },

    // Skickar olika bokningsrelaterade förfrågningar (boka, reservera, avboka) till servern via WebSocket för att uppdatera bokningsstatus i realtid
    bookBooking({ state }, bookingData) {
      state.socket.emit("book-booking", bookingData);
    },
    reserveBooking({ state }, bookingData) {
      state.socket.emit("reserve-booking", bookingData);
    },
    cancelReservation({ state }, bookingData) {
      state.socket.emit("cancel-reservation", bookingData);
    },
    cancelBooking({ state }, bookingData) {
      state.socket.emit("cancel-booking", bookingData);
    },

    // Lyssnar på olika WebSocket-händelser från servern och uppdaterar state vid förändringar
    setupSocketListeners({ commit, state }) {
      const { socket: storeSocket } = state;

      if (!storeSocket.hasSetupListeners) {
        storeSocket.on("booking-booked", (updatedBooking) => {
          commit("updateBookingStatus", updatedBooking);
        });

        storeSocket.on("booking-reserved", (reservedBooking) => {
          commit("updateBookingStatus", reservedBooking);
        });

        storeSocket.on("booking-released", (releasedBooking) => {
          commit("updateBookingStatus", releasedBooking);
        });

        storeSocket.on("bookings-updated", (newBookings) => {
          commit("setBookings", newBookings);
        });

        storeSocket.on("booking-cancelled", (updatedBooking) => {
          commit("updateBookingStatus", updatedBooking);
        });

        storeSocket.hasSetupListeners = true;  // Flagga för att undvika dubbelregistrering
      }
    },
  },
});

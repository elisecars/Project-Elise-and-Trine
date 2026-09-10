<template>
  <div class="group container">
    <h2 class="mb-4">Join a Group</h2>

    <!-- Lista alla grupper och deras medlemmar -->
    <div
      v-for="group in groups"
      :key="group.id"
      class="group-card mb-3 p-3 border rounded"
    >
      <!-- Visar gruppens namn -->
      <h3>{{ escapeHtml(group.name) }}</h3>

      <!-- Lista över elever i gruppen -->
      <ul>
        <li v-for="student in group.students" :key="student">
          {{ escapeHtml(student) }}
        </li>
      </ul>

      <!-- Knapp för att gå med i en grupp, inaktiveras om man redan är med -->
      <button
        type="button"
        class="btn btn-primary join-button"
        :disabled="selectedGroup === group.name"  
        @click="joinGroup(group)"
      >
        Join {{ escapeHtml(group.name) }}
      </button>
    </div>

    <!-- Skapa en ny grupp -->
    <div class="mb-4 mt-4">
      <label for="newGroup" class="form-label">Create a New Group</label>
      <input
        id="newGroup"
        v-model="newGroupName"
        class="form-control"
        type="text"
        placeholder="Enter group name"
      />
      <!-- Skapa-knapp som aktiveras när något skrivs -->
      <button
        type="button"
        class="btn btn-secondary mt-2"
        :disabled="!newGroupName"
        @click="createGroup"
      >
        Create Group
      </button>
    </div>
  </div>
</template>

<script>
import escapeHtml from "../escapeHtml";

export default {
  name: "GroupPage",
  data() {
    return {
      selectedGroup: "",
      newGroupName: "",
      msg: "",
      success: false,
    };
  },
  computed: {
    // Hämtar alla grupper från store
    groups() {
      return this.$store.state.groups;
    },
    // Hämtar inloggat användarnamn från store
    username() {
      return this.$store.state.username;
    },
  },
  async mounted() {
    // Hämtar alla grupper när sidan laddas
    await this.fetchGroups();
  },

  /* Nya metoder för att hämta grupper, gå med i grupper och skapa nya grupper */
  //Grupperna har user id och grup id som fält för att hålla reda på vilka elever som är i vilken grupp
  methods: {
    escapeHtml,

    // Hämtar grupper från servern
    async fetchGroups() {
      await this.$store.dispatch("fetchGroups");
    },

    // Försöker gå med i en grupp
    async joinGroup(group) {
      // Skickar en joinGroup-request till Vuex med gruppens ID och användarnamn
      const success = await this.$store.dispatch("joinGroup", {
        groupId: group.id,
        username: this.username,
      });

      // Uppdaterar gruppdata efter lyckad anslutning
      if (success) await this.fetchGroups();
    },

    // Skapar en ny grupp med angivet namn
    async createGroup() {
      // Skickar en createGroup-request till Vuex med gruppnamnet
      const success = await this.$store.dispatch(
        "createGroup",
        this.newGroupName,
      );

      if (success) {
        this.newGroupName = ""; // Töm inputfältet
        await this.fetchGroups(); // Hämta uppdaterad lista
      }
    },
  },
};
</script>

<style scoped>
.group-card {
  background-color: #f9f9f9;
  padding: 1rem;
  border-radius: 6px;
  box-shadow: 0 0 4px color(from black r g b / 10%);
  width: 100%;
  height: auto;
}

.group-card h3 {
  font-size: 1.2rem;
  margin-bottom: 0.8rem;
}

.group-card ul {
  list-style-type: none;
  padding-left: 0;
}

.group-card li {
  margin-bottom: 0.3rem;
}

.group-card button {
  margin-top: 0.8rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}
</style>

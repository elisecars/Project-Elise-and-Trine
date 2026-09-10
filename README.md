# Bokningssystem
Detta projekt är ett webbaserat bokningssystem utvecklat med Vue.js på klientsidan och Express.js på serversidan. Socket.IO används för att uppdatera bokningar i realtid och SQLite används för att lagra användare, grupper och bokningar.

Systemet har två typer av användare: studenter och assistenter.

# Vad programmet gör
Student
    Som student kan man:
    - Registrera sig och logga in
    - Se tillgängliga bokningstider
    - Boka en ledig tid
    - Avboka en bokad tid innan avbokningsdeadline
    - Skapa en grupp
    - Gå med i en grupp
    - Se vilka tider som är bokade eller reserverade

    Om en student tillhör en grupp gäller bokningsgränsen för hela gruppen. En student eller grupp kan ha maximalt tre bokningar.

    När en student väljer en tid reserveras den tillfälligt innan bokningen genomförs. Detta förhindrar att två personer bokar samma tid samtidigt.

Assistent
    Som assistent kan man:
    - Logga in på en separat adminsida
    - Skapa nya bokningstider
    - Lägga till flera tider samtidigt
    - Redigera befintliga bokningstider
    - Ta bort bokningstider
    - Se framtida bokningar
    - Se information om vem som har bokat eller avbokat en tid

    Formuläret för att skapa bokningar sparas även som ett utkast.

# Teknik
Projektet använder:
- Vue.js
- Vue Router
- Vuex
- Vite
- Bootstrap
- Express.js
- Socket.IO
- SQLite
- Express Session
- bcrypt

Klienten finns i client och servern finns i server.

# Köra programmet

1. Klona repot
Klona projektet och navigera till projektmappen:
git clone <repository-url>
cd <projektmapp>

2. Installera paket
Kör följande från projektets rotmapp:
npm install

3. Starta programmet
Kör:
npm start

Detta startar servern och gör Vue applikationen tillgänglig.

4. Öppna programmet
Öppna följande adress i webbläsaren:
http://localhost:8989
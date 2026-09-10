// util.js innehåller hjälpfunktioner för att arbeta med filvägar och läsa filer
import fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Bestämmer roten av projektet genom att gå två nivåer upp från den nuvarande filen
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Funktion som tar ett valfritt antal delvägar och skapar en fullständig sökväg från projektets rot
const resolvePath = (...path) => join(root, ...path);

// En funktion som läser in en fil asynkront och returnerar dess innehåll som en Promise
const readFile = (path) =>
  new Promise((resolve, reject) => {
    fs.readFile(path, "utf8", (err, data) => {
      if (err)
        reject(err); // Om det finns ett fel vid läsning avvisar vi Promise
      else resolve(data); // Annars returnerar vi filens innehåll
    });
  });

// Exporterar de två funktionerna
export { readFile, resolvePath };

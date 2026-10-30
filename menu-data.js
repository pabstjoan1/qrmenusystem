/* ==========================================================================
   menu-data.js — DIE SPEISEKARTE (Demo-Karte zum Vorstellen des Systems)
   Pro Artikel:
     id        eindeutige Nummer
     name      Anzeigename
     category  Kategorie (die Kategorie-Leiste entsteht automatisch daraus)
     price     Preis der Standardgröße in €
     img       Foto-Link ODER leer lassen → dann erscheint eine Kachel mit dem Emoji
     emoji     Emoji für die Kachel (und als Ersatz, falls ein Foto nicht lädt)
     sizes     false = keine Auswahl "Standard/Groß" (z. B. bei Getränken)
   Die Fotos stammen von Unsplash (frei nutzbar). Ich habe jedes Foto anhand
   seiner Bildbeschreibung auf Unsplash dem Gericht zugeordnet.
   Eigene Fotos: einfach bei "img" den Link bzw. Dateinamen (z. B. "bilder/pizza.jpg") eintragen.
   ========================================================================== */
const U = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&q=80`;

const database = [
    // Pizza
    { id: 1,  name: "Pizza Margherita (Tomate, Mozzarella, Basilikum)", category: "Pizza", price: 10.50, emoji: "🍕", img: U("1574071318508-1cdbab80d002") },
    { id: 2,  name: "Pizza Rucola mit Parmesan",                         category: "Pizza", price: 13.50, emoji: "🍕", img: U("1593560708920-61dd98c46a4e") },
    { id: 3,  name: "Pizza Pomodoro mit frischem Basilikum",             category: "Pizza", price: 11.90, emoji: "🍕", img: U("1669895616443-5d21d5acc6e0") },
    { id: 4,  name: "Pizza Classica vom Holzbrett",                      category: "Pizza", price: 12.50, emoji: "🍕", img: U("1565299624946-b28f40a0ae38") },
    // Pasta
    { id: 5,  name: "Pasta al Pesto mit Tomaten",                        category: "Pasta", price: 12.50, emoji: "🍝", img: U("1473093295043-cdd812d0e601") },
    { id: 6,  name: "Pasta Pomodoro (Tomatensauce)",                     category: "Pasta", price: 10.90, emoji: "🍝", img: U("1516100882582-96c3a05fe590") },
    { id: 7,  name: "Spaghetti Classico",                                category: "Pasta", price: 11.50, emoji: "🍝", img: U("1556761223-4c4282c73f77") },
    { id: 8,  name: "Tagliatelle mit Kirschtomaten",                     category: "Pasta", price: 12.90, emoji: "🍝", img: U("1498579150354-977475b7ea0b") },
    { id: 9,  name: "Pasta mit Garnelen",                                category: "Pasta", price: 15.90, emoji: "🍤", img: U("1563379926898-05f4575a45d8") },
    // Salate
    { id: 10, name: "Gemischter Salat",                                  category: "Salate", price: 8.90,  emoji: "🥗", img: U("1512621776951-a57141f2eefd") },
    { id: 11, name: "Power Bowl mit Gemüse & Fleisch",                   category: "Salate", price: 14.50, emoji: "🥗", img: U("1546069901-ba9599a7e63c") },
    { id: 12, name: "Tomatensalat mit Blattsalat",                       category: "Salate", price: 9.50,  emoji: "🍅", img: U("1592417817098-8fd3d9eb14a5") },
    // Snacks
    { id: 13, name: "Pommes mit Dip",                                    category: "Snacks", price: 5.50,  emoji: "🍟", img: U("1761934051063-1b3ea9516ed7"), sizes: false },
    { id: 14, name: "Sandwich mit Ei",                                   category: "Snacks", price: 7.90,  emoji: "🥪", img: U("1482049016688-2d3e1b311543"), sizes: false },
    { id: 15, name: "Grillteller mit Fleisch & Gemüse",                  category: "Snacks", price: 17.90, emoji: "🍖", img: U("1555939594-58d7cb561ad1"),    sizes: false },
    // Desserts
    { id: 16, name: "Himbeerkuchen",                                     category: "Desserts", price: 5.90, emoji: "🍰", img: U("1565958011703-44f9829ba187"), sizes: false },
    { id: 17, name: "Süßer Toast mit Blaubeeren",                        category: "Desserts", price: 6.50, emoji: "🫐", img: U("1484723091739-30a097e8f929"), sizes: false },
    // Getränke (ohne Foto → Emoji-Kachel)
    { id: 18, name: "Cola (0,33 l)",                                     category: "Getränke", price: 3.80, emoji: "🥤", img: "", sizes: false },
    { id: 19, name: "Orangenlimonade (0,33 l)",                          category: "Getränke", price: 3.80, emoji: "🍊", img: "", sizes: false },
    { id: 20, name: "Mineralwasser (0,5 l)",                             category: "Getränke", price: 3.20, emoji: "💧", img: "", sizes: false },
    { id: 21, name: "Apfelschorle (0,4 l)",                              category: "Getränke", price: 4.20, emoji: "🍏", img: "", sizes: false },
    { id: 22, name: "Espresso",                                          category: "Getränke", price: 2.60, emoji: "☕", img: "", sizes: false },
    { id: 23, name: "Cappuccino",                                        category: "Getränke", price: 3.60, emoji: "☕", img: "", sizes: false },
    // Cocktails & mehr
    { id: 24, name: "Aperol Spritz",                                     category: "Cocktails", price: 7.90, emoji: "🍹", img: "", sizes: false },
    { id: 25, name: "Hugo (Prosecco, Minze & Holunder)",                 category: "Cocktails", price: 7.90, emoji: "🥂", img: "", sizes: false },
    { id: 26, name: "Pils vom Fass (0,4 l)",                             category: "Cocktails", price: 4.50, emoji: "🍺", img: "", sizes: false },
    { id: 27, name: "Rotwein (0,2 l Glas)",                              category: "Cocktails", price: 6.90, emoji: "🍷", img: "", sizes: false }
];

/* ==========================================================================
   config.js — ZENTRALE EINSTELLUNGEN
   Wird von index.html (Gäste-App) UND dashboard.html (Küche) geladen.
   So muss die Firebase-Konfiguration nur an EINER Stelle gepflegt werden.
   ========================================================================== */

const RESTAURANT_NAME = "QrMenu Solutions";

/* --- Firebase (neues Projekt qrmenusolutions-522d9). Der Name MUSS FIREBASE_CONFIG lauten. --- */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAfEhLST41auYy6u0n9K0rhSDBsO8sHQGI",
  authDomain: "qrmenusolutions-522d9.firebaseapp.com",
  projectId: "qrmenusolutions-522d9",
  storageBucket: "qrmenusolutions-522d9.firebasestorage.app",
  messagingSenderId: "45026605785",
  appId: "1:45026605785:web:34d03681ecfcced5b8dcc8",
  measurementId: "G-7H1BDX5GKT"
};

/* --- Allgemeine App-Einstellungen --- */
const APP_CONFIG = {
    maxTable: 200,              // höchste erlaubte Tischnummer
    largeFactor: 1.35,          // Preisfaktor für die Größe "Groß"
    tipPercents: [5, 10, 15],   // Trinkgeld-Stufen in % (zusätzlich gibt es "Kein" und "Eigener Betrag")
    askTableEachSession: true   // true = Tisch-Fenster erscheint bei JEDEM neuen Besuch (vorausgefüllt)
};

/* --- Zahlungen ---
   ACHTUNG: Ohne Zahlungsanbieter wird bei Apple Pay / Google Pay NICHTS abgebucht.
   - PayPal: ersetze "sb" (Sandbox) durch deine Live-Client-ID.
   - Google Pay: "TEST" liefert nur Test-Tokens. Für Live: environment "PRODUCTION",
     merchantId von der Google Pay Console, gateway + gatewayMerchantId deines Anbieters (z. B. Stripe).
   - Apple Pay: braucht Händler-Zertifikat + einen Server, der die Händler-Validierung
     durchführt (validationUrl). Ohne validationUrl wird der Button ausgeblendet.
   - backendUrl: Server-Endpunkt, der das Wallet-Token beim Anbieter belastet und {ok:true} zurückgibt.
     Ohne backendUrl werden Wallet-Zahlungen als "..._TEST" markiert (nicht abgebucht). */
const PAYMENT_CONFIG = {
    currency: "EUR",
    countryCode: "DE",
    paypalClientId: "sb",
    backendUrl: "",
    googlePay: {
        environment: "TEST",
        merchantId: "",
        gateway: "example",
        gatewayMerchantId: "exampleGatewayMerchantId"
    },
    applePay: { validationUrl: "" }
};

/* ==========================================================================
   script.js — App-Logik der Gäste-Seite
   Abhängigkeiten (in index.html geladen): config.js, menu-data.js, Firebase.
   Aufbau: 1 Hilfsfunktionen · 2 Firebase · 3 Overlays · 4 Tisch · 5 Menü
           6 Warenkorb · 7 Bestellung/Service (→ Dashboard) · 8 Zahlungen · 9 Start
   ========================================================================== */
"use strict";

/* ---------- 1. HILFSFUNKTIONEN ---------- */
const $ = (sel) => document.querySelector(sel);

// Schützt vor HTML-Injection: Gäste-Notizen landen im Dashboard und dürfen nie als HTML laufen.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const euro = (n) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

// Speicher mit Absicherung (iOS Privatmodus wirft Fehler)
const makeStore = (area) => ({
    get: (k) => { try { return window[area].getItem(k); } catch { return null; } },
    set: (k, v) => { try { window[area].setItem(k, v); } catch { /* ignorieren */ } }
});
const local = makeStore("localStorage");      // überlebt Browser-Neustart (Warenkorb, letzter Tisch)
const session = makeStore("sessionStorage");  // gilt nur für diesen Besuch (bestätigter Tisch, Session-ID)

function showToast(msg) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = msg;
    $("#toastBox").appendChild(toast);
    setTimeout(() => toast.remove(), 3300);
}


// Übersetzt Firebase-Fehlercodes in einen verständlichen Hinweis (steht auch in der Browser-Konsole)
function describeError(err) {
    const code = (err && err.code) || "unbekannt";
    const hints = {
        "permission-denied": "Firestore-Regeln verbieten das Schreiben",
        "unavailable": "Keine Verbindung zu Firestore (Adblocker/Netzwerk?)",
        "failed-precondition": "Firestore-Datenbank fehlt oder ist nicht bereit",
        "not-found": "Firestore-Datenbank nicht gefunden",
        "invalid-argument": "Ungültige Daten"
    };
    console.error("Firestore-Fehler:", code, err);
    return `${hints[code] || "Fehler"} [${code}]`;
}

/* ---------- Zustand ---------- */
const state = {
    table: null,
    cart: [],
    category: "Alle",
    tip: { mode: "none", value: 0 },   // Trinkgeld: none | pct (Prozent) | custom (fester Betrag)
    // Eindeutige ID dieses Besuchs: Damit hört die App nur auf die eigenen Bestellungen
    sessionId: session.get("sid") || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random())
};
session.set("sid", state.sessionId);

const categories = ["Alle", ...new Set(database.map((i) => i.category))];
const cartTotal = () => state.cart.reduce((sum, i) => sum + i.price * i.qty, 0); // Zwischensumme (nur Speisen)
const round2 = (n) => Math.round(n * 100) / 100;

// Trinkgeld-Stufen: in config.js über APP_CONFIG.tipPercents änderbar, z. B. [5, 10, 15, 20]
const TIP_PERCENTS = APP_CONFIG.tipPercents || [5, 10, 15];
function tipAmount() {
    const { mode, value } = state.tip;
    if (mode === "pct") return round2(cartTotal() * value / 100);
    if (mode === "custom") return round2(Math.min(Math.max(value || 0, 0), 200)); // 0 – 200 €
    return 0;
}
const payTotal = () => round2(cartTotal() + tipAmount()); // Betrag, den der Gast wirklich zahlt

/* ---------- 2. FIREBASE ---------- */
let db = null;
let demoMode = false; // Ohne Firebase läuft die App im Demo-Modus (Bestellungen nur in der Konsole)
// Akzeptiert FIREBASE_CONFIG (config.js) und auch den Standardnamen firebaseConfig aus der Firebase-Console
const fbConfig = typeof FIREBASE_CONFIG !== "undefined" ? FIREBASE_CONFIG : (typeof firebaseConfig !== "undefined" ? firebaseConfig : null);
try {
    if (typeof firebase === "undefined") throw new Error("Firebase-Skripte nicht geladen (Internet/Adblocker?)");
    if (!fbConfig || !fbConfig.apiKey) throw new Error("Firebase-Konfiguration fehlt: In config.js muss 'const FIREBASE_CONFIG = {...}' stehen");
    firebase.initializeApp(fbConfig);
    db = firebase.firestore();
} catch (e) {
    console.warn("Demo-Modus aktiv:", e.message);
    demoMode = true;
}
const serverTime = () => (demoMode ? new Date() : firebase.firestore.FieldValue.serverTimestamp());

/* ---------- 3. OVERLAYS (Warenkorb, Service, Zahlen) ---------- */
function openLayer(id) {
    closeLayers();
    $("#" + id).classList.add("is-open");
    $("#backdrop").classList.add("is-open");
    document.body.classList.add("no-scroll");
}
function closeLayers() {
    document.querySelectorAll(".drawer, .sheet").forEach((el) => el.classList.remove("is-open"));
    $("#backdrop").classList.remove("is-open");
    document.body.classList.remove("no-scroll");
}

/* ---------- 4. TISCHNUMMER ---------- */
function parseTable(value) {
    const n = parseInt(value, 10);
    return Number.isInteger(n) && n >= 1 && n <= APP_CONFIG.maxTable ? n : null;
}

function setTable(n, remember = true) {
    state.table = n;
    $("#tableLabel span").textContent = "Tisch " + n;
    $("#cartTable").textContent = "Tisch " + n;
    if (remember) {
        session.set("table", String(n)); // bestätigt für diese Session
        local.set("table_v2", String(n)); // Vorschlag für den nächsten Besuch
    }
}

function openTableModal(prefill) {
    $("#tableInput").value = prefill || state.table || "";
    $("#tableError").hidden = true;
    $("#tableClose").hidden = !state.table; // Schließen erst möglich, wenn ein Tisch gesetzt ist
    $("#tableModal").classList.add("is-open");
    setTimeout(() => $("#tableInput").focus(), 300);
}
const closeTableModal = () => $("#tableModal").classList.remove("is-open");

function saveTable() {
    const n = parseTable($("#tableInput").value);
    if (!n) {
        $("#tableError").textContent = `Bitte eine Tischnummer zwischen 1 und ${APP_CONFIG.maxTable} eingeben.`;
        $("#tableError").hidden = false;
        return;
    }
    setTable(n);
    closeTableModal();
    showToast(`Tisch ${n} gespeichert 👍`);
}

function initTable() {
    const fromUrl = parseTable(new URLSearchParams(location.search).get("table")); // QR-Code: index.html?table=5
    const fromSession = parseTable(session.get("table"));
    const lastUsed = parseTable(local.get("table_v2"));

    // Schon in dieser Session bestätigt (z. B. nach Neuladen) → kein erneutes Fenster
    if (fromSession && (!fromUrl || fromUrl === fromSession)) return setTable(fromSession, false);

    const candidate = fromUrl || lastUsed;
    if (candidate && !APP_CONFIG.askTableEachSession) return setTable(candidate);
    openTableModal(candidate); // vorausgefüllt: Gast muss nur noch bestätigen
}

/* ---------- 5. MENÜ & KATEGORIEN ---------- */
function renderCategories() {
    $("#categoryNav").innerHTML = categories
        .map((c) => `<button class="cat-btn ${c === state.category ? "active" : ""}" data-action="filter" data-cat="${esc(c)}">${esc(c)}</button>`)
        .join("");
}

function cardTemplate(item, index) {
    const large = (Math.round(item.price * APP_CONFIG.largeFactor * 10) / 10).toFixed(2);
    return `
    <article class="card" style="animation-delay:${Math.min(index, 15) * 0.03}s">
        <div class="img-container">${item.img
            ? `<img class="food-img" src="${esc(item.img)}" alt="${esc(item.name)}" data-emoji="${esc(item.emoji || "🍽️")}" loading="lazy">`
            : `<div class="food-tile" role="img" aria-label="${esc(item.name)}">${esc(item.emoji || "🍽️")}</div>`}</div>
        <div class="card-details">
            <h3>${esc(item.name)}</h3>
            <div class="card-selectors">
                ${item.sizes === false ? "" : `<select id="size_${item.id}" aria-label="Größe">
                    <option value="${item.price.toFixed(2)}">Standard (${euro(item.price)})</option>
                    <option value="${large}">Groß (${euro(Number(large))})</option>
                </select>`}
                <input type="text" id="note_${item.id}" placeholder="Notiz (z. B. ohne Zwiebeln)" maxlength="120" aria-label="Notiz">
            </div>
            <div class="card-meta">
                <span class="price">${euro(item.price)}</span>
                <button class="btn btn-primary btn-add" data-action="add" data-id="${item.id}"><i class="fa-solid fa-plus"></i> Hinzufügen</button>
            </div>
        </div>
    </article>`;
}

function renderMenu() {
    const items = state.category === "Alle" ? database : database.filter((i) => i.category === state.category);
    $("#menuGrid").innerHTML = items.map(cardTemplate).join(""); // ein einziger DOM-Schreibvorgang (schnell)
}

function setCategory(cat) {
    state.category = cat;
    renderCategories();
    renderMenu();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- 6. WARENKORB ---------- */
function addToCart(id) {
    if (!state.table) return openTableModal();
    const item = database.find((i) => i.id === id);
    const sizeEl = $("#size_" + id); // fehlt bei Artikeln mit sizes:false
    const note = $("#note_" + id).value.trim();
    const size = sizeEl && sizeEl.selectedIndex === 1 ? "Groß" : "Standard";
    const price = sizeEl ? parseFloat(sizeEl.value) : item.price;

    const existing = state.cart.find((c) => c.id === id && c.size === size && c.note === note);
    if (existing) existing.qty++;
    else state.cart.push({ id, name: item.name, price, size, note, qty: 1 });

    $("#note_" + id).value = "";
    renderCart();
    showToast("Im Warenkorb 🛒");
    const badge = $("#cartCount");
    badge.classList.remove("bump");
    void badge.offsetWidth; // Animation neu starten
    badge.classList.add("bump");
}

function changeQty(index, delta) {
    state.cart[index].qty += delta;
    if (state.cart[index].qty <= 0) state.cart.splice(index, 1);
    renderCart();
}

function renderTip() {
    const sub = cartTotal();
    const options = [
        { mode: "none", value: 0, label: "Kein", sub: "" },
        ...TIP_PERCENTS.map((p) => ({ mode: "pct", value: p, label: p + " %", sub: euro(round2(sub * p / 100)) })),
        { mode: "custom", value: 0, label: "Eigener", sub: "Betrag" }
    ];
    $("#tipChips").innerHTML = options.map((o) => {
        const active = state.tip.mode === o.mode && (o.mode !== "pct" || state.tip.value === o.value);
        return `<button class="tip-chip ${active ? "active" : ""}" data-action="tip" data-mode="${o.mode}" data-value="${o.value}"><b>${o.label}</b><small>${o.sub}</small></button>`;
    }).join("");
    $("#tipCustom").hidden = state.tip.mode !== "custom";
}

function setTip(mode, value) {
    state.tip = { mode, value: mode === "custom" ? parseFloat($("#tipInput").value) || 0 : value };
    renderCart();
    if (mode === "custom") $("#tipInput").focus();
}

function renderCart() {
    $("#cartList").innerHTML = state.cart.length
        ? state.cart.map((item, i) => `
            <div class="cart-item">
                <div>
                    <h4>${esc(item.name)}</h4>
                    <p>${esc(item.size)}${item.note ? ` · „${esc(item.note)}“` : ""}</p>
                    <strong>${euro(item.price * item.qty)}</strong>
                </div>
                <div class="qty">
                    <button data-action="qty" data-index="${i}" data-delta="-1" aria-label="Weniger">−</button>
                    <span>${item.qty}</span>
                    <button data-action="qty" data-index="${i}" data-delta="1" aria-label="Mehr">+</button>
                </div>
            </div>`).join("")
        : `<div class="cart-empty">Dein Warenkorb ist leer.</div>`;

    $("#cartCount").textContent = state.cart.reduce((n, i) => n + i.qty, 0);
    renderTip();
    $("#tipBox").hidden = !state.cart.length;
    $("#subTotal").textContent = euro(cartTotal());
    $("#tipTotal").textContent = euro(tipAmount());
    $("#tipRow").hidden = tipAmount() <= 0;
    $("#totalPrice").textContent = euro(payTotal());
    $("#checkoutBtn").disabled = !state.cart.length;
    $("#cartPay").hidden = !state.cart.length;
    local.set("cart_v2", JSON.stringify(state.cart));
}

/* ---------- 7. BESTELLUNG & SERVICE → DASHBOARD ----------
   Jedes Dokument in der Collection "orders" erscheint sofort im Dashboard.
   Felder: type (ORDER|SERVICE|PAYMENT), tableNumber, status, timestamp, sessionId
           ORDER:   items[{name,qty,size,note,price}], totalPrice, payment, paymentMethod
           SERVICE/PAYMENT: message                                                    */
function sendPayload(payload) {
    const doc = { ...payload, tableNumber: state.table, sessionId: state.sessionId, status: "eingegangen", timestamp: serverTime() };
    if (demoMode) { console.log("Demo-Modus, würde senden:", doc); return Promise.resolve(); }
    return db.collection("orders").add(doc);
}

async function checkout(payment = "UNBEZAHLT", extra = {}) {
    if (!state.cart.length) return;
    if (!state.table) return openTableModal();
    if (state.sending) return; // verhindert Doppelbestellungen (auch über mehrere Zahl-Buttons)
    state.sending = true;
    const btn = $("#checkoutBtn");
    btn.disabled = true;
    try {
        await sendPayload({
            type: "ORDER",
            items: state.cart.map(({ name, qty, size, note, price }) => ({ name, qty, size, note, price })),
            subtotal: round2(cartTotal()),   // nur Speisen
            tip: tipAmount(),                // Trinkgeld in €
            totalPrice: payTotal(),          // Zwischensumme + Trinkgeld
            payment, ...extra
        });
        showToast(payment === "BAR" ? "🧑‍🍳 Bestellung gesendet – Bezahlung bar beim Kellner" : payment === "UNBEZAHLT" ? "🧑‍🍳 Bestellung gesendet!" : "✅ Bestellung & Zahlung übermittelt!");
        state.cart = [];
        state.tip = { mode: "none", value: 0 };
        $("#tipInput").value = "";
        renderCart();
        closeLayers();
    } catch (err) {
        showToast("⚠️ Senden fehlgeschlagen: " + describeError(err)); // Warenkorb bleibt erhalten
    } finally {
        state.sending = false;
        btn.disabled = !state.cart.length;
    }
}

function requestService(type, message, toast) {
    closeLayers();
    sendPayload({ type, message })
        .then(() => showToast(toast))
        .catch((err) => showToast("⚠️ Anfrage fehlgeschlagen: " + describeError(err)));
}

// Statusänderungen aus dem Dashboard live beim Gast anzeigen
function watchMyOrders() {
    if (demoMode) return;
    db.collection("orders").where("sessionId", "==", state.sessionId).onSnapshot((snap) => {
        snap.docChanges().forEach((change) => {
            if (change.type !== "modified") return;
            const { status, type } = change.doc.data();
            if (status === "in_arbeit") showToast(type === "ORDER" ? "👨‍🍳 Deine Bestellung wird zubereitet!" : "🚶 Der Service ist unterwegs!");
            if (status === "erledigt") showToast(type === "ORDER" ? "✅ Deine Bestellung ist fertig. Guten Appetit!" : "✅ Erledigt!");
        });
    }, (err) => describeError(err)); // Lesefehler nur loggen, Bestellen funktioniert unabhängig davon
}

/* ---------- 8. ZAHLUNGEN ---------- */
const scriptCache = {};
const loadScript = (src) => scriptCache[src] ||= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error("Laden fehlgeschlagen: " + src));
    document.head.appendChild(s);
});

// Bar: Kellner kommt an den Tisch (Meldung erscheint im Dashboard)
function payCash() {
    requestService("PAYMENT", "Zahlung via Bar", `💳 Der Kellner kommt zu Tisch ${state.table}!`);
}

// Wallet-Zahlung abschließen. Ohne backendUrl wird NICHT abgebucht → Kennzeichnung "_TEST".
async function completeWalletPayment(method, token) {
    let live = false;
    if (PAYMENT_CONFIG.backendUrl) {
        const res = await fetch(PAYMENT_CONFIG.backendUrl, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ method, token, amount: payTotal(), currency: PAYMENT_CONFIG.currency })
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) throw new Error("Zahlung abgelehnt");
        live = true;
    }
    await checkout(live ? "ONLINE_BEZAHLT" : method + "_TEST", { paymentMethod: method });
}

async function setupPayPal(target) {
    await loadScript(`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(PAYMENT_CONFIG.paypalClientId)}&currency=${PAYMENT_CONFIG.currency}`);
    paypal.Buttons({
        style: { layout: "vertical", color: "gold", shape: "rect", height: 48 },
        createOrder: (d, actions) => actions.order.create({ purchase_units: [{ amount: { value: payTotal().toFixed(2) } }] }),
        onApprove: (d, actions) => actions.order.capture().then(() => checkout("ONLINE_BEZAHLT", { paymentMethod: "PAYPAL", paymentRef: d.orderID })),
        onError: (err) => { console.error(err); showToast("❌ Zahlungsfehler."); }
    }).render(target);
}

async function setupGooglePay(target) {
    await loadScript("https://pay.google.com/gp/p/js/pay.js");
    const cfg = PAYMENT_CONFIG.googlePay;
    const client = new google.payments.api.PaymentsClient({ environment: cfg.environment });
    const card = {
        type: "CARD",
        parameters: { allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"], allowedCardNetworks: ["MASTERCARD", "VISA"] }
    };
    const base = { apiVersion: 2, apiVersionMinor: 0, allowedPaymentMethods: [card] };
    const { result } = await client.isReadyToPay(base);
    if (!result) return; // Gerät/Browser unterstützt Google Pay nicht → Button bleibt weg

    $(target).appendChild(client.createButton({
        buttonColor: "white", buttonType: "pay", buttonSizeMode: "fill",
        onClick: () => client.loadPaymentData({
            ...base,
            allowedPaymentMethods: [{ ...card, tokenizationSpecification: { type: "PAYMENT_GATEWAY", parameters: { gateway: cfg.gateway, gatewayMerchantId: cfg.gatewayMerchantId } } }],
            merchantInfo: { merchantId: cfg.merchantId, merchantName: RESTAURANT_NAME },
            transactionInfo: { totalPriceStatus: "FINAL", totalPrice: payTotal().toFixed(2), currencyCode: PAYMENT_CONFIG.currency, countryCode: PAYMENT_CONFIG.countryCode }
        }).then((data) => completeWalletPayment("GOOGLE_PAY", data.paymentMethodData.tokenizationData.token))
          .catch((err) => { if (err.statusCode !== "CANCELED") { console.error(err); showToast("❌ Google Pay fehlgeschlagen."); } })
    }));
}

function setupApplePay(target) {
    // Nur in Safari mit eingerichteter Wallet UND konfigurierter Händler-Validierung
    if (!window.ApplePaySession || !ApplePaySession.canMakePayments() || !PAYMENT_CONFIG.applePay.validationUrl) return;
    const btn = document.createElement("button");
    btn.className = "wallet-btn apple-pay-btn";
    btn.setAttribute("aria-label", "Mit Apple Pay bezahlen");
    btn.onclick = () => {
        const s = new ApplePaySession(3, {
            countryCode: PAYMENT_CONFIG.countryCode, currencyCode: PAYMENT_CONFIG.currency,
            supportedNetworks: ["visa", "masterCard"], merchantCapabilities: ["supports3DS"],
            total: { label: RESTAURANT_NAME, amount: payTotal().toFixed(2) }
        });
        s.onvalidatemerchant = (e) => fetch(PAYMENT_CONFIG.applePay.validationUrl, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ validationURL: e.validationURL })
        }).then((r) => r.json()).then((m) => s.completeMerchantValidation(m)).catch(() => s.abort());
        s.onpaymentauthorized = (e) => completeWalletPayment("APPLE_PAY", e.payment.token)
            .then(() => s.completePayment(ApplePaySession.STATUS_SUCCESS))
            .catch(() => s.completePayment(ApplePaySession.STATUS_FAILURE));
        s.begin();
    };
    $(target).appendChild(btn);
}

// Orte, an denen die Online-Zahlungsbuttons erscheinen (Zahlen-Sheet und Warenkorb)
const PAY_SHEET_IDS = { apple: "#applePayBox", google: "#googlePayBox", paypal: "#paypalBox" };
const CART_PAY_IDS = { apple: "#cartApplePay", google: "#cartGooglePay", paypal: "#cartPayPal" };

// Zeichnet Apple Pay / Google Pay / PayPal in die angegebenen Container
function mountPayments(ids) {
    Object.values(ids).forEach((sel) => ($(sel).innerHTML = ""));
    setupApplePay(ids.apple);
    // Fehler eines Anbieters (z. B. Skript blockiert) dürfen die anderen nicht stoppen
    return Promise.allSettled([setupGooglePay(ids.google), setupPayPal(ids.paypal)]);
}

// Zahlen-Sheet: Online-Buttons nur anzeigen, wenn etwas im Warenkorb liegt
function openPay() {
    openLayer("paySheet");
    const hasItems = cartTotal() > 0;
    $("#payHint").hidden = hasItems;
    $("#payOnline").hidden = !hasItems;
    $("#payAmount").hidden = !hasItems;
    $("#payAmount").textContent = hasItems ? `Zu zahlen: ${euro(payTotal())}` + (tipAmount() > 0 ? ` (inkl. ${euro(tipAmount())} Trinkgeld)` : "") : "";
    if (hasItems) mountPayments(PAY_SHEET_IDS);
}

// Warenkorb öffnen: Zahlungsarten direkt unter der Summe anzeigen
function openCart() {
    openLayer("cartDrawer");
    state.payMounted = false;
    togglePayPanel(false); // Zahlungsarten starten eingeklappt → Warenkorb bleibt gut sichtbar
}

// Zahlungsarten auf-/zuklappen. Die Online-Buttons werden erst beim Aufklappen geladen.
function togglePayPanel(open = !$("#cartPay").classList.contains("open")) {
    $("#cartPay").classList.toggle("open", open);
    $("#payToggle").setAttribute("aria-expanded", open);
    if (!open) return;
    if (!state.payMounted) { state.payMounted = true; mountPayments(CART_PAY_IDS); }
    setTimeout(() => $("#payPanel").scrollIntoView({ block: "nearest", behavior: "smooth" }), 300);
}

/* ---------- 9. START & EVENTS ---------- */
// Alle Klicks laufen über data-action (kein inline-onclick → sauberer & sicherer)
const actions = {
    "filter": (el) => setCategory(el.dataset.cat),
    "show-all": () => setCategory("Alle"),
    "add": (el) => addToCart(Number(el.dataset.id)),
    "qty": (el) => changeQty(Number(el.dataset.index), Number(el.dataset.delta)),
    "open-layer": (el) => openLayer(el.dataset.target),
    "open-cart": openCart,
    "toggle-pay": () => togglePayPanel(),
    "tip": (el) => setTip(el.dataset.mode, Number(el.dataset.value)),
    "order-cash": () => checkout("BAR"), // Bestellung senden, Bezahlung bar am Tisch
    "close-layers": closeLayers,
    "open-pay": openPay,
    "open-table": () => { closeLayers(); openTableModal(); },
    "close-table": closeTableModal,
    "save-table": saveTable,
    "checkout": () => checkout(),
    "service": (el) => requestService("SERVICE", el.dataset.msg, el.dataset.msg.includes("Rechnung") ? "🧾 Rechnung angefordert!" : "🙋‍♂️ Service gerufen!"),
    "pay-cash": payCash
};
document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (el) actions[el.dataset.action]?.(el);
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeLayers(); if (state.table) closeTableModal(); }
    if (e.key === "Enter" && e.target.id === "tableInput") saveTable();
});
// Lädt ein Foto nicht, erscheint stattdessen die Emoji-Kachel (kein kaputtes Bild)
document.addEventListener("error", (e) => {
    if (!e.target.classList?.contains("food-img")) return;
    const tile = document.createElement("div");
    tile.className = "food-tile";
    tile.textContent = e.target.dataset.emoji || "🍽️";
    e.target.replaceWith(tile);
}, true);

function init() {
    $("#restaurantName").textContent = RESTAURANT_NAME;
    document.title = RESTAURANT_NAME + " – Speisekarte";
    try { state.cart = JSON.parse(local.get("cart_v2")) || []; } catch { state.cart = []; }
    $("#tipInput").addEventListener("input", (e) => { state.tip.value = parseFloat(e.target.value) || 0; renderCart(); });
    renderCategories();
    renderMenu();
    renderCart();
    initTable();
    watchMyOrders();
    // Im Demo-Modus kommt NICHTS in der Küche an → deutlich warnen
    if (demoMode) setTimeout(() => showToast("⚠️ Demo-Modus: Bestellungen werden NICHT an die Küche gesendet"), 800);
}
init(); // Skripte sind "defer" → DOM ist hier bereits fertig

const apiBase = "/api";
const searchForm = document.getElementById("search-form");
const resultsDiv = document.getElementById("results");

let hospitalLat = null;
let hospitalLon = null;

/* 🏥 Step 1: Detect hospital location accurately */
window.addEventListener("DOMContentLoaded", () => {
  if (!navigator.geolocation) {
    resultsDiv.innerHTML = `<p>❌ Geolocation is not supported by your browser.</p>`;
    return;
  }

  resultsDiv.innerHTML = `<p>📍 Detecting hospital location... Please allow location access.</p>`;

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      hospitalLat = pos.coords.latitude.toFixed(6);
      hospitalLon = pos.coords.longitude.toFixed(6);
      console.log("✅ Hospital Location:", hospitalLat, hospitalLon);

      // Show detected location
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${hospitalLat}&lon=${hospitalLon}&format=json`
        );
        const data = await res.json();
        const address =
          data.display_name ||
          `${hospitalLat}, ${hospitalLon} (approximate location)`;

        resultsDiv.innerHTML = `<p>✅ Location detected:</p><p>${address}</p>`;
      } catch (err) {
        resultsDiv.innerHTML = `<p>✅ Location detected: (${hospitalLat}, ${hospitalLon})</p>`;
      }
    },
    (err) => {
      console.error("❌ Geolocation error:", err);
      resultsDiv.innerHTML = `<p>⚠️ Unable to detect location: ${err.message}</p>`;
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
});

/* 🔍 Step 2: Search donors near hospital */
searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!hospitalLat || !hospitalLon) {
    resultsDiv.innerHTML = `<p>⚠️ Please allow location access first.</p>`;
    return;
  }

  const blood_group = new FormData(searchForm).get("blood_group");
  resultsDiv.innerHTML = `<p>🔎 Searching nearby donors...</p>`;

  try {
    const params = new URLSearchParams({
      latitude: hospitalLat,
      longitude: hospitalLon,
      blood_group: blood_group || "",
    });

    const res = await fetch(`${apiBase}/hospitals/nearby-donors?${params}`);
    const donors = await res.json();

    if (!Array.isArray(donors) || donors.length === 0) {
      resultsDiv.innerHTML = `<p>No donors found nearby.</p>`;
      return;
    }

    renderDonors(donors);
  } catch (err) {
    console.error("❌ Error fetching donors:", err);
    resultsDiv.innerHTML = `<p>⚠️ Error fetching donors.</p>`;
  }
});

/* 🧩 Step 3: Display donors with phone number + distance */
function renderDonors(donors) {
  resultsDiv.innerHTML = "<h3>Nearby Donors</h3>";

  donors.forEach((d) => {
    const distanceText =
      d.distance === null
        ? "N/A"
        : `${parseFloat(d.distance).toFixed(2)} km`;

    const el = document.createElement("div");
    el.className = "donor-card";
    el.style.margin = "10px 0";
    el.style.padding = "12px";
    el.style.borderRadius = "10px";
    el.style.background = "#fff";
    el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.1)";

    el.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="font-size:1.1em;">${d.name}</strong><br>
          🩸 ${d.blood_group}<br>
          📍 ${d.city || "Unknown"}<br>
          📞 ${d.contact || "Not provided"}
        </div>
        <div style="text-align:right; color:#444;">
          🚗 <b>Distance: ${distanceText}</b>
        </div>
      </div>
    `;

    resultsDiv.appendChild(el);
  });
}

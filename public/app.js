const donorForm = document.getElementById("donor-form");
const donorMsg = document.getElementById("donor-msg");
const searchForm = document.getElementById("search-form");
const resultsDiv = document.getElementById("results");

const apiBase = "/api";

/* 🌍 Accurate Auto-detection using Geolocation + OpenStreetMap */
window.addEventListener("DOMContentLoaded", () => {
  const cityInput = document.querySelector('input[name="city"]');
  if (!cityInput) return;

  const cityStatus = document.createElement("small");
  cityStatus.id = "city-status";
  cityStatus.style.display = "block";
  cityStatus.style.marginTop = "4px";
  cityStatus.style.color = "#666";
  cityStatus.textContent = "Detecting location...";
  cityInput.insertAdjacentElement("afterend", cityStatus);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lon = pos.coords.longitude.toFixed(6);
        console.log("📍 Accurate coordinates detected:", lat, lon);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
            {
              headers: {
                "User-Agent": "BloodConnectApp/1.0 (contact@example.com)",
                "Accept-Language": "en",
              },
            }
          );
          const data = await res.json();

          if (data && data.address) {
            const addr = data.address;
            const road = addr.road || addr.residential || addr.neighbourhood || "";
            const landmark = addr.suburb || addr.locality || "";
            const city = addr.city || addr.town || addr.village || "";
            const state = addr.state || "";
            const pincode = addr.postcode || "";
            const country = addr.country || "";

            const fullAddress = [road, landmark, city, state, pincode, country]
              .filter(Boolean)
              .join(", ");

            cityInput.value = city;
            cityInput.dataset.lat = lat;
            cityInput.dataset.lon = lon;
            cityInput.dataset.fullAddress = fullAddress;

            cityStatus.textContent = `📍 Location detected: ${fullAddress}`;
            cityStatus.style.color = "green";
          } else {
            cityStatus.textContent = "⚠️ Could not detect full address.";
            cityStatus.style.color = "red";
          }
        } catch (err) {
          console.error("Reverse geocode error:", err);
          cityStatus.textContent = "⚠️ Error fetching location. Type manually.";
          cityStatus.style.color = "red";
        }
      },
      (err) => {
        console.warn("❌ Geolocation error:", err);
        cityStatus.textContent = "❌ Permission denied. Type manually.";
        cityStatus.style.color = "red";
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  } else {
    cityStatus.textContent = "❌ Geolocation not supported. Type manually.";
    cityStatus.style.color = "red";
  }
});

/* 🩸 Register Donor */
if (donorForm) {
  donorForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    donorMsg.textContent = "";
    const data = Object.fromEntries(new FormData(donorForm).entries());
    const cityInput = document.querySelector('input[name="city"]');

    if (cityInput) {
      data.address = cityInput.dataset.fullAddress || data.city;
      data.latitude = cityInput.dataset.lat ? parseFloat(cityInput.dataset.lat) : null;
      data.longitude = cityInput.dataset.lon ? parseFloat(cityInput.dataset.lon) : null;
    }

    console.log("📤 Sending donor data:", data);

    if (!data.name || !data.phone || !data.age || !data.blood_group || !data.city) {
      donorMsg.style.color = "red";
      donorMsg.textContent = "⚠️ Please fill all required fields.";
      return;
    }

    try {
      const res = await fetch(`${apiBase}/donors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok) {
        donorMsg.style.color = "green";
        donorMsg.textContent = "✅ Registered successfully!";
        donorForm.reset();
      } else {
        donorMsg.style.color = "red";
        donorMsg.textContent = json.error || "Error during registration.";
      }
    } catch (err) {
      console.error("Submit error:", err);
      donorMsg.style.color = "red";
      donorMsg.textContent = "⚠️ Network error.";
    }
  });
}

/* 🔍 Search Donors (hospital page) */
if (searchForm) {
  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    resultsDiv.innerHTML = "Searching...";
    const params = new URLSearchParams(new FormData(searchForm).entries());
    try {
      const res = await fetch(`${apiBase}/donors/search?${params.toString()}`);
      const list = await res.json();
      renderResults(list);
    } catch (err) {
      console.error("Search error:", err);
      resultsDiv.textContent = "⚠️ Error fetching results.";
    }
  });
}

/* 🧩 Render Donor Results */
function renderResults(list) {
  if (!resultsDiv) return;
  if (!list || list.length === 0) {
    resultsDiv.innerHTML = "<p>No donors found.</p>";
    return;
  }
  resultsDiv.innerHTML = "";
  list.forEach((d) => {
    const el = document.createElement("div");
    el.className = "donor";
    el.innerHTML = `
      <strong>${escapeHtml(d.name)}</strong> (${d.age || "N/A"} yrs)
      <br>🩸 ${escapeHtml(d.blood_group)}
      <br>📍 ${escapeHtml(d.address || d.city || "N/A")}
      <br>📞 ${d.contact || ""} ${d.email ? "- " + escapeHtml(d.email) : ""}
      ${
        d.latitude && d.longitude
          ? `<br>🌐 (${d.latitude}, ${d.longitude})`
          : ""
      }
    `;
    resultsDiv.appendChild(el);
  });
}

/* 🧹 Escape HTML helper */
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, (s) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s])
  );
}

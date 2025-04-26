(function () {
  const spinner = document.querySelector(".spinner-container");
  const map = L.map("map", {
    zoomSnap: 0.1,
    center: [37.4769, -82.5242],
    zoom: 12,
  });

  // Create Leaflet panes
  ["bottom", "middle", "top"].forEach((pane, i) => {
    map.createPane(pane);
    map.getPane(pane).style.zIndex = 401 + i;
  });

  // Base Layers
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "Imagery &copy; Esri",
    }
  ).addTo(map);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | PEC',
      pane: "top",
    }
  ).addTo(map);

  function showSpinner() {
    spinner.style.display = "flex";
  }
  function hideSpinner() {
    spinner.style.display = "none";
  }

  function getURL(lat, lon) {
    return lat === "N/A" || lon === "N/A"
      ? "N/A"
      : `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`;
  }

  function renderData(data, color, layerGroup) {
    data.forEach((row) => {
      const lat = parseFloat(row.DOTLatitude),
        lon = parseFloat(row.DOTLongitude);
      const rfLat =
        row.RFLatitude === "N/A" ? "N/A" : parseFloat(row.RFLatitude);
      const rfLon =
        row.RFLongitude === "N/A" ? "N/A" : parseFloat(row.RFLongitude);
      const lsLat =
        row.LSLatitude === "N/A" ? "N/A" : parseFloat(row.LSLatitude);
      const lsLon =
        row.LSLongitude === "N/A" ? "N/A" : parseFloat(row.LSLongitude);
      const rank = parseInt(row.Rank);
      const detourLength = parseFloat(row.DetourLength);

      if (!isNaN(lat) && !isNaN(lon) && !isNaN(rank)) {

        const marker = L.circleMarker([lat, lon], {
          radius: 10,
          weight: 2,
          color: color,
          fillColor: color,
          fillOpacity: 0.6,
          pane: "middle",
        }).addTo(layerGroup);

        // Create a custom divIcon for the rank label
        const rankLabel = L.divIcon({
          className: "rank-label",
          html: `<span>${rank}</span>`,
          iconSize: [0, 0],
          iconAnchor: [5, 10],
        });

        // Add label to the map
        L.marker([lat, lon], { icon: rankLabel, pane: "top" }).addTo(
          layerGroup
        );
        

        const rockfallURL = getURL(rfLat, rfLon);
        const landslideURL = getURL(lsLat, lsLon);

        const popup = `
          <strong>Rank</strong>: ${rank}<br>
          <strong>County</strong>: ${row.County}<br>
          <strong>Route</strong>: ${row.RT_Label}<br>
          <strong>Functional Classification</strong>: ${
            row.FunctionalClassification
          }<br>
          <strong>Rockfall MP</strong>: ${
            rockfallURL === "N/A"
              ? "N/A"
              : `<a href="${rockfallURL}" target="_blank">${row.RFMP}</a>`
          }<br>
          <strong>Landslide MP</strong>: ${
            landslideURL === "N/A"
              ? "N/A"
              : `<a href="${landslideURL}" target="_blank">${row.LSMP}</a>`
          }<br>
        `;

        marker.bindPopup(popup);
        marker.on("mouseover", () =>
          marker.setStyle({ weight: 2.5, color: "#FF0", fillOpacity: 1 })
        );
        marker.on("mouseout", () =>
          marker.setStyle({ weight: 2, color: color, fillOpacity: 0.6 })
        );
      }
    });
  }

  function createLegend() {
    const legendDiv = document.getElementById("legend");
    legendDiv.innerHTML = `
      <div><span class="legend-symbol sites"></span>Top 50 Sites</div>
      <div><span class="legend-symbol-square county"></span>District 10 Counties</div>
      <div><span class="legend-symbol-square d10"></span>KYTC District 10</div>
    `;
  }

  async function fetchData() {
    showSpinner();

    try {
      const sites = await d3.csv("data/Top_50_Sites_Final.csv");

      const d10 = await d3.json("data/d10-polygon.geojson");
      const counties = await d3.json("data/d10-counties-polygon.geojson");

      L.geoJSON(counties, {
        style: { color: "#ffffe4", weight: 2, fillOpacity: 0 },
      }).addTo(map);
      L.geoJSON(d10, {
        style: { color: "#ff0", weight: 4, fillOpacity: 0 },
      }).addTo(map);

      map.fitBounds(L.geoJSON(d10).getBounds(), { padding: [20, 20] });

      const sitesLayer = L.layerGroup().addTo(map);

      renderData(sites, "#a100e0", sitesLayer);
      createLegend();

      const sidePanel = document.getElementById("side-panel");
      const siteList = document.getElementById("site-list");

      sites.sort((a, b) => parseInt(a.Rank) - parseInt(b.Rank));
      sites.forEach((site) => {
        const siteItem = document.createElement("div");
        siteItem.className = "legend-text";
        siteItem.innerHTML = `<span style="font-weight:700;">Rank ${site.Rank}</span>: ${site.RT_Label}, ${site.County} COUNTY`;

        siteItem.addEventListener("click", () => {
          const lat = parseFloat(site.DOTLatitude);
          const lon = parseFloat(site.DOTLongitude);
          const rank = parseInt(site.Rank);

          if (!isNaN(lat) && !isNaN(lon)) {
            map.flyTo([lat, lon], 14, { duration: 1.0 });

            sitesLayer.eachLayer((layer) => {
              const layerLatLng = layer.getLatLng();
              if (
                layerLatLng &&
                layerLatLng.lat === lat &&
                layerLatLng.lng === lon
              ) {
                layer.openPopup();
              }
            });

            document
              .querySelectorAll(".legend-text")
              .forEach((el) => el.classList.remove("active"));
            siteItem.classList.add("active");
          }
        });

        siteList.appendChild(siteItem);
      });

      // Clear Button
      document.getElementById("clear-btn").addEventListener("click", () => {
        map.fitBounds(L.geoJSON(d10).getBounds(), { padding: [20, 20] });

        // Close any open popups
        map.closePopup();

        // Fade out active site
        document.querySelectorAll(".legend-text.active").forEach((el) => {
          el.style.transition = "background-color 0.4s ease";
          el.style.backgroundColor = "#fff"; // Fade it back to white
          setTimeout(() => {
            el.classList.remove("active"); // Actually remove class after fade
          }, 400);
        });
      });



    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      hideSpinner();
    }
  }

  fetchData();
})();

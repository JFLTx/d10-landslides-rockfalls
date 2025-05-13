(function () {
  const spinner = document.querySelector(".spinner-container");
  const map = L.map("map", {
    zoomSnap: 0.1,
    center: [37.4769, -82.5242],
    zoom: 12,
  });

  // Create Leaflet panes
  ["bottom", "middle", "top", "labels"].forEach((pane, i) => {
    map.createPane(pane);
    map.getPane(pane).style.zIndex = 401 + i;
  });

  const icon = L.divIcon({
    className: "custom-circle-marker",
    iconSize: [20, 20],
    iconAnchor: [10, 10], // center of the point's lat/lon
    popupAnchor: [0, -10], // offset half the distance of the iconSize val
  });

  // Base Layers
  const imagery = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { attribution: "Imagery &copy; Esri", opacity: 0.8 }
  );

  const darkTopo = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }
  );

  const topo = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}",
    {
      attribution:
        "Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC",
      maxZoom: 16,
    }
  );

  const labels = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | PEC',
      pane: "top",
    }
  ).addTo(map);

  const basemaps = {
    Imagery: imagery,
    "Dark Gray": darkTopo,
    Topographic: topo,
    // Labels: labels,
  };

  const basemapThumbnails = {
    Imagery: "images/imagery-thumb1.jpg",
    "Dark Gray": "images/darkTopo-thumb1.jpg",
    Topographic: "images/topo-thumb1.jpg",
  };

  imagery.addTo(map);
  labels.addTo(map);

  const basemapControl = L.control({ position: "topright" });

  basemapControl.onAdd = function (map) {
    const container = L.DomUtil.create(
      "div",
      "leaflet-control-layers leaflet-control"
    );
    container.innerHTML = `
    <button id="basemap-button" class="leaflet-bar">Switch Basemap</button>
    <div id="basemap-options" style="display:none; padding:5px; text-align:center;">
      ${Object.keys(basemaps)
        .map(
          (name) => `
        <img src="${basemapThumbnails[name]}" title="${name}" data-layer="${name}" style="width:50px;height:50px;margin:5px;cursor:pointer;border:2px solid #ccc;border-radius:5px;">
      `
        )
        .join("")}
    </div>
  `;
    return container;
  };

  basemapControl.addTo(map);

  // Add click listeners after a delay to ensure it's loaded
  setTimeout(() => {
    const basemapButton = document.getElementById("basemap-button");
    const basemapOptions = document.getElementById("basemap-options");

    basemapButton.addEventListener("click", () => {
      // Toggle showing thumbnails
      basemapOptions.style.display =
        basemapOptions.style.display === "none" ? "block" : "none";
    });

    document.querySelectorAll("#basemap-options img").forEach((img) => {
      img.addEventListener("click", function () {
        const layerName = this.getAttribute("data-layer");

        // Remove all basemaps and labels first
        Object.values(basemaps).forEach((layer) => map.removeLayer(layer));
        map.removeLayer(labels);

        // Add selected basemap
        basemaps[layerName].addTo(map);

        // If imagery selected, also add labels
        if (layerName === "Imagery") {
          labels.addTo(map);
        }

        // Update button text
        basemapButton.textContent = `${layerName}`;

        // Hide the thumbnail selector after choosing
        basemapOptions.style.display = "none";
      });
    });
  }, 1000);

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

  function renderData(data, color, layerGroup, labelsLayer) {
    data.forEach((row) => {
      const lat = parseFloat(row.Latitude),
        lon = parseFloat(row.Longitude);
      // const rfLat =
      //   row.RFLatitude === "N/A" ? "N/A" : parseFloat(row.RFLatitude);
      // const rfLon =
      //   row.RFLongitude === "N/A" ? "N/A" : parseFloat(row.RFLongitude);
      // const lsLat =
      //   row.LSLatitude === "N/A" ? "N/A" : parseFloat(row.LSLatitude);
      // const lsLon =
      //   row.LSLongitude === "N/A" ? "N/A" : parseFloat(row.LSLongitude);
      const rank = parseInt(row.Rank);
      const detourLength = parseFloat(row["Detour Length (mi)"]);
      const FS = row["Field Score"];
      const RI = row["Risk Index"];
      const ADT = row["ADT(max)"];
      const ES = row["Exposure Score (MAX%)"];
      const project = row["Project Type"];

      if (!isNaN(lat) && !isNaN(lon) && !isNaN(rank)) {
        const marker = L.marker([lat, lon], {
          // radius: 10,
          // weight: 2,
          // color: color,
          // fillColor: color,
          // fillOpacity: 0.6,
          icon: icon,
          pane: "middle",
          customData: { rank: rank },
        }).addTo(layerGroup);

        // Create a custom divIcon for the rank label
        const rankLabel = L.divIcon({
          className: "rank-label",
          html: `<span>${rank}</span>`,
          iconSize: [0, 0],
          iconAnchor: [5, 10],
        });

        // Add label to the map
        const labelMarker = L.marker([lat, lon], {
          icon: rankLabel,
          pane: "labels", // all labels render at this level first
        });

        labelMarker.rank = rank; // store rank for reference
        labelsLayer.addLayer(labelMarker);

        // const rockfallURL = getURL(rfLat, rfLon);
        // const landslideURL = getURL(lsLat, lsLon);
        const URL = getURL(lat, lon);

        const popup = `
          <strong>Rank</strong>: ${rank}<br>
          <strong>County</strong>: ${row.County}<br>
          <strong>Route</strong>: KY-${row["Road #"]}<br>
          <strong>Project Type</strong>: ${row["Project Type"]}<br>
          <strong>Mile Point</strong>: ${
            URL === "N/A"
              ? "N/A"
              : `<a href="${URL}" target="_blank">${row.MP}</a>`
          }<br>
          <strong>Risk Index</strong>: ${RI}<br>
          <strong>Field Score</strong>: ${FS}<br>
          <strong>Exposure Score (Max %)</strong>: ${ES}<br>
          <strong>ADT</strong>: ${ADT}<br>
          <strong>Detour Length (mi)</strong>: ${detourLength}<br>
          <strong>Functional Classification</strong>: ${
            row["Functional Classification"]
          }
        `;

        marker.bindPopup(popup);
        // marker.on("mouseover", () => {
        //   marker.getElement().style.transform = "scale(1.4)";
        // });
        // marker.on("mouseout", () => {
        //   marker.getElement().style.transform = "scale(1)";
        // });
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
      const sites = await d3.csv("data/Top-Sites-Final.csv");

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
      const labelsLayer = L.layerGroup().addTo(map); // separate group for labels

      renderData(sites, "#a100e0", sitesLayer, labelsLayer);

      createLegend();

      const sidePanel = document.getElementById("side-panel");
      const siteList = document.getElementById("site-list");

      sites.sort((a, b) => parseInt(a.Rank) - parseInt(b.Rank));
      sites.forEach((site) => {
        const siteItem = document.createElement("div");
        siteItem.className = "legend-text";
        siteItem.innerHTML = `<span style="font-weight:700;">Rank ${site.Rank}</span>: KY-${site["Road #"]}, ${site.County} COUNTY`;

        siteItem.addEventListener("click", () => {
          const lat = parseFloat(site.Latitude);
          const lon = parseFloat(site.Longitude);
          const rank = parseInt(site.Rank);

          if (!isNaN(lat) && !isNaN(lon)) {
            map.flyTo([lat, lon], 14, { duration: 1.5 });

            sitesLayer.eachLayer((layer) => {
              const layerLatLng = layer.getLatLng();
              const customData = layer.options?.customData;

              // shift label positions based on matching selected rank value from button click
              labelsLayer.eachLayer((label) => {
                labelsLayer.removeLayer(label); // Remove existing label

                const isTarget = label.rank === rank;
                const newLabel = L.marker(label.getLatLng(), {
                  icon: label.options.icon,
                  pane: isTarget ? "labels" : "bottom",
                  opacity: isTarget ? 1 : 0, // fully transparent if not selected
                });
                newLabel.rank = label.rank;
                labelsLayer.addLayer(newLabel);
              });

              if (
                layerLatLng &&
                customData &&
                layerLatLng.lat === lat &&
                layerLatLng.lng === lon &&
                customData.rank === rank // ensures the popup opens that matches rank values and not just lat/lon
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

        // reset map labels
        labelsLayer.eachLayer((label) => {
          labelsLayer.removeLayer(label);
          const resetLabel = L.marker(label.getLatLng(), {
            icon: label.options.icon,
            pane: "labels",
            opacity: 1,
          });
          resetLabel.rank = label.rank;
          labelsLayer.addLayer(resetLabel);
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

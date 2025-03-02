(function () {
  // HTML options
  const spinner = document.querySelector(".spinner-container");

  // Map options
  const options = {
    zoomSnap: 0.1,
    center: [37.4769, -82.5242],
    zoom: 12,
  };

  // Create the Leaflet map
  const map = L.map("map", options);

  // create Leaflet panes for ordering map layers
  setPanes = ["bottom", "middle", "top"];
  setPanes.forEach((pane, i) => {
    map.createPane(pane);
    map.getPane(pane).style.zIndex = 401 + i;
  });

  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "Imagery &copy; Esri",
    }
  ).addTo(map);

  // labels for map
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | PEC',
      pane: "top",
    }
  ).addTo(map);

  // Function to show the spinner
  function showSpinner() {
    spinner.style.display = "flex"; // Show the spinner
  }

  // Function to hide the spinner
  function hideSpinner() {
    spinner.style.display = "none"; // Hide the spinner
  }

  function calcSize(rank) {
    const maxSize = 28;
    const minSize = 4;
    return maxSize - ((rank - 1) * (maxSize - minSize)) / 49;
  }

  // const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=$`;

  // Function to construct a Street View URL
  function getURL(lat, lon) {
    return lat === "N/A" || lon === "N/A"
      ? "N/A"
      : `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`;
  }

  // function to render the data
  function renderData(data, color, layerGroup) {
    data.forEach((row, index) => {
      const lat = parseFloat(row.DOTLatitude);
      const lon = parseFloat(row.DOTLongitude);
      const rfLat =
        row.RFLatitude === "N/A" ? "N/A" : parseFloat(row.RFLatitude);
      const rfLon =
        row.RFLongitude === "N/A" ? "N/A" : parseFloat(row.RFLongitude);
      const lsLat =
        row.LSLatitude === "N/A" ? "N/A" : parseFloat(row.LSLatitude);
      const lsLon =
        row.LSLongitude === "N/A" ? "N/A" : parseFloat(row.LSLongitude);
      const rank = parseInt(row.Rank);
      const route = row.RT_Label;
      const siteCo = row.County;
      const fc = row.FunctionalClassification;
      const rfMP = row.RFMP;
      const lsMP = row.LSMP;

      if (!isNaN(lat) && !isNaN(lon) && !isNaN(rank)) {
        const size = calcSize(rank);

        const marker = L.circleMarker([lat, lon], {
          radius: size,
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
        // }

        // Generate the Street View URLs
        const rockfallURL = getURL(rfLat, rfLon);
        const landslideURL = getURL(lsLat, lsLon);

        // Generate the Street View URL
        // const streetViewUrl = getURL(lat, lon);

        const popup = `
          <strong>Rank</strong>: ${rank}<br>
          <strong>County</strong>: ${siteCo}<br>
          <strong>Route</strong>: ${route}<br>
          <strong>Functional Classification</strong>: ${fc}<br>
          <strong>Rockfall MP</strong>: ${
            rockfallURL === "N/A"
              ? "N/A"
              : `<a href="${rockfallURL}" target="_blank">${rfMP}</a>`
          }<br>
          <strong>Landslide MP</strong>: ${
            landslideURL === "N/A"
              ? "N/A"
              : `<a href="${landslideURL}" target="_blank">${lsMP}</a>`
          }
        `;

        // Add popup with rank
        marker.bindPopup(popup);

        marker.on("mouseover", function () {
          this.setStyle({
            weight: 2.5,
            color: "#FF0",
            fillOpacity: 1,
          });
        });

        marker.on("mouseout", function () {
          this.setStyle({
            weight: 2,
            color: color,
            fillOpacity: 0.6,
          });
        });
      }
    });
  }

  // Create a legend
  function createLegend() {
    const legend = L.control({ position: "bottomright" });

    legend.onAdd = function () {
      const div = L.DomUtil.create("div", "legend");
      div.innerHTML = `
      <h4>Legend</h4>
      <div><span class="legend-symbol sites"></span>Top 50 Sites</div>
      <div><span class="legend-symbol-square county"></span>District 10 Counties</div>
      <div><span class="legend-symbol-square d10"></span>KYTC District 10</div>`;
      return div;
    };

    legend.addTo(map);
  }

  // Load the data asynchronously
  async function fetchData() {
    showSpinner();

    try {
      // Load the data
      // const rockfalls = await d3.csv("data/Top 50 Rockfalls.csv");
      // const landslides = await d3.csv("data/Top 50 Landslides.csv");
      const sites = await d3.csv("data/Top 50 Sites D10.csv");
      const d10 = await d3.json("data/d10-polygon.geojson");
      const counties = await d3.json("data/d10-counties-polygon.geojson");

      const county = L.geoJSON(counties, {
        style: function (feature) {
          return {
            color: "#ffffe4",
            weight: 2,
            fillOpacity: 0,
          };
        },
      }).addTo(map);

      const district10 = L.geoJSON(d10, {
        style: function (feature) {
          return {
            color: "#ff0",
            weight: 4,
            fillOpacity: 0,
          };
        },
      }).addTo(map);

      // Fit the bounds to the district limits
      map.fitBounds(district10.getBounds(), {
        padding: [20, 20],
      });

      // Create layer groups for rockfalls and landslides
      // const rockfallLayer = L.layerGroup().addTo(map);
      // const landslideLayer = L.layerGroup().addTo(map);
      const sitesLayer = L.layerGroup().addTo(map);

      // Render the data points
      // renderData(rockfalls, "#FF0000", rockfallLayer); // Red for rockfalls
      // renderData(landslides, "#004DA8", landslideLayer); // Blue for landslides
      renderData(sites, "#a100e0", sitesLayer);

      createLegend(); // draws the legend
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      // when success happens!
      hideSpinner();
    }
  }

  fetchData();
})();

// import maplibregl from "maplibre-gl";
// import * as pmtiles from "pmtiles";
// import * as d3 from "d3";
// import * as turf from "@turf/turf";

import { PMTiles } from "pmtiles";

// Set up pmtiles protocol
let protocol = new PMTiles.Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);

let map;

// const siteListDiv = document.getElementById("site-list");
let sitePointsGeoJSON = {
  type: "FeatureCollection",
  features: [],
};

function getStreetViewURL(lat, lon) {
  return lat === "N/A" || lon === "N/A"
    ? "N/A"
    : `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`;
}

function hideSpinner() {
  const spinner = document.querySelector(".spinner-container");
  if (spinner) {
    spinner.style.display = "none";
  }
}

async function loadData() {
  try {
    const [sitesData, d10GeoJSON, countiesGeoJSON] = await Promise.all([
      d3.csv("../data/Top_50_Sites_Final.csv"),
      d3.json("../data/d10-polygon.geojson"),
      d3.json("../data/d10-counties-polygon.geojson"),
    ]);

    // Build sitePoints GeoJSON
    sitesData.forEach((row) => {
      const lat = parseFloat(row.DOTLatitude);
      const lon = parseFloat(row.DOTLongitude);
      if (!isNaN(lat) && !isNaN(lon)) {
        sitePointsGeoJSON.features.push({
          type: "Feature",
          properties: {
            rank: parseInt(row.Rank),
            county: row.County,
            route: row.RT_Label,
            functionalClass: row.FunctionalClassification,
            rfLat: row.RFLatitude,
            rfLon: row.RFLongitude,
            rfMP: row.RFMP,
            lsLat: row.LSLatitude,
            lsLon: row.LSLongitude,
            lsMP: row.LSMP,
          },
          geometry: {
            type: "Point",
            coordinates: [lon, lat],
          },
        });
      }
    });

    createMap(d10GeoJSON, countiesGeoJSON);
    hideSpinner();
    console.log(`Loaded ${sitePointsGeoJSON.features.length} sites.`);
  } catch (error) {
    console.error("Error loading data:", error);
    hideSpinner();
  }
}

function createMap(d10GeoJSON, countiesGeoJSON) {
  map = new maplibregl.Map({
    container: "map",
    style: {
      version: 8,
      sources: {
        satellite: {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
        },
        // hillshade: {
        //   type: "raster",
        //   tiles: [
        //     "https://kygisserver.ky.gov/arcgis/rest/services/WGS84WM_Services/Ky_MultiDirectional_Hillshade_WGS84WM/MapServer/tile/{z}/{y}/{x}",
        //   ],
        //   tileSize: 512,
        // },
        dem: {
          type: "raster-dem",
          url: "./terrain.json",
        },
        "ky-streams": {
          type: "vector",
          url: "pmtiles://https://contig.us/data/pmtiles/ky_strm_line.pmtiles",
        },
        "ky-area": {
          type: "vector",
          url: "pmtiles://https://contig.us/data/pmtiles/ky_strm_area.pmtiles",
        },
        "ky-waterbody": {
          type: "vector",
          url: "pmtiles://https://contig.us/data/pmtiles/ky_strm_waterbody.pmtiles",
        },
        sites: {
          type: "geojson",
          data: sitePointsGeoJSON,
        },
        d10: {
          type: "geojson",
          data: d10GeoJSON,
        },
        counties: {
          type: "geojson",
          data: countiesGeoJSON,
        },
      },
      layers: [
        {
          id: "background",
          type: "background",
          paint: { "background-color": "#ddeeff" },
        },
        // {
        //   id: "hillshade",
        //   type: "raster",
        //   source: "hillshade",
        //   paint: { "raster-opacity": 0.3 },
        // },
        {
          id: "satellite",
          type: "raster",
          source: "satellite",
          paint: { "raster-opacity": 1 },
        },
        {
          id: "district-10-extruded",
          type: "fill-extrusion",
          source: "d10",
          paint: {
            "fill-extrusion-color": "#ffff00",
            "fill-extrusion-opacity": 0,
            "fill-extrusion-height": 50,   // 50 meters tall above ground
            "fill-extrusion-base": 0
          }
        },        
        {
          id: "ky-streams",
          type: "line",
          source: "ky-streams",
          "source-layer": "ky_strm_line",
          filter: ["any", ["in", "ftype", 460, 558]], // Filter for streams
          layout: {
            visibility: "visible",
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#4fa9e9",
            "line-width": 2,
            "line-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0, 13, 1],
          },
        },
        {
          id: "ky-area",
          type: "fill",
          source: "ky-area",
          "source-layer": "ky_strm_area",
          layout: {
            visibility: "visible",
          },
          paint: {
            "fill-color": [
              "match",
              ["get", "ftype"],
              403,
              "#8cc4e7", // Flood areas lighter blue
              "#4fa9e9", // Other areas darker blue
            ],
            "fill-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0, 8, 1],
          },
        },
        {
          id: "ky-waterbody",
          type: "fill",
          source: "ky-waterbody",
          "source-layer": "ky_strm_waterbody",
          layout: {
            visibility: "visible",
          },
          paint: {
            "fill-color": "#4fa9e9",
            "fill-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0, 13, 1],
          },
        },
        {
          id: "ky-ponds",
          type: "fill",
          source: "ky-waterbody",
          "source-layer": "ky_strm_waterbody",
          filter: ["<=", ["get", "areasqkm"], 0.05],
          layout: {
            visibility: "visible",
          },
          paint: {
            "fill-color": "#4fa9e9",
            "fill-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0, 13, 1],
          },
        },
        {
          id: "sites-points",
          type: "circle",
          source: "sites",
          paint: {
            "circle-radius": 8,
            "circle-color": "#a100e0",
            "circle-stroke-width": 1,
            "circle-stroke-color": "#fff",
          },
        },
      ],
    },
    center: [-83.5, 37.5],
    zoom: 8,
    pitch: 60,
    bearing: -20,
    hash: true,
  });

  map.on("load", () => {
    map.setTerrain({ source: "dem", exaggeration: 2 });

    const bbox = turf.bbox(d10GeoJSON);
    map.fitBounds(bbox, { padding: 10 });

    // Only AFTER the layer exists
    map.on("click", "sites-points", (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["sites-points"],
      });

      if (!features.length) {
        return;
      }

      const feature = features[0];
      const props = feature.properties || {};

      const rfLat =
        props.rfLat && props.rfLat !== "N/A" ? parseFloat(props.rfLat) : null;
      const rfLon =
        props.rfLon && props.rfLon !== "N/A" ? parseFloat(props.rfLon) : null;
      const lsLat =
        props.lsLat && props.lsLat !== "N/A" ? parseFloat(props.lsLat) : null;
      const lsLon =
        props.lsLon && props.lsLon !== "N/A" ? parseFloat(props.lsLon) : null;

      const rfURL = rfLat && rfLon ? getStreetViewURL(rfLat, rfLon) : "N/A";
      const lsURL = lsLat && lsLon ? getStreetViewURL(lsLat, lsLon) : "N/A";

      const popupHTML = `
        <strong>Rank:</strong> ${props.rank || "N/A"}<br>
        <strong>County:</strong> ${props.county || "N/A"}<br>
        <strong>Route:</strong> ${props.route || "N/A"}<br>
        <strong>Functional Class:</strong> ${props.functionalClass || "N/A"}<br>
        <strong>Rockfall MP:</strong> ${
          rfURL === "N/A"
            ? "N/A"
            : `<a href="${rfURL}" target="_blank">${props.rfMP || "Link"}</a>`
        }<br>
        <strong>Landslide MP:</strong> ${
          lsURL === "N/A"
            ? "N/A"
            : `<a href="${lsURL}" target="_blank">${props.lsMP || "Link"}</a>`
        }
      `;

      new maplibregl.Popup()
        .setLngLat(feature.geometry.coordinates)
        .setHTML(popupHTML)
        .addTo(map);
    });

    // Change cursor style
    map.on("mouseenter", "sites-points", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "sites-points", () => {
      map.getCanvas().style.cursor = "";
    });
  });
}

loadData();

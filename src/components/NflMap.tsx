"use client";

import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { Topology } from "topojson-specification";
import { FeatureCollection } from "geojson";

export default function NflMap() {
  // State to hold the GeoJSON data for the US states
  const [usStates, setUsStates] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    // This function fetches the map data when the component loads
    const getMapData = async () => {
      try {
        console.log("Fetching US map data...");
        // Fetch a standard US geography file from a reliable CDN
        const usTopology = (await d3.json(
          "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json",
        )) as Topology;

        // Convert the TopoJSON data into a GeoJSON FeatureCollection
        const geoJson = topojson.feature(
          usTopology,
          usTopology.objects.states,
        ) as FeatureCollection;

        console.log("Successfully loaded and converted map data:", geoJson);
        setUsStates(geoJson);
      } catch (error) {
        console.error("Failed to load map data:", error);
      }
    };

    getMapData();
  }, []); // The empty array [] ensures this runs only once

  // This function assigns a random color to each state
  const getStateStyle = () => {
    return {
      fillColor: `hsl(${Math.random() * 360}, 100%, 50%)`, // Random hue
      weight: 1,
      color: "white",
      fillOpacity: 0.7,
    };
  };

  return (
    <MapContainer
      center={[39.8283, -98.5795]} // Center of the US
      zoom={4}
      style={{ height: "100vh", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {/* If usStates data exists, render it on the map */}
      {usStates && <GeoJSON data={usStates} style={getStateStyle} />}
    </MapContainer>
  );
}

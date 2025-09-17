"use client";

import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { geoVoronoi } from "d3-geo-voronoi";
import * as turf from "@turf/turf";
import { stadiums } from "@/data/stadiums";
import { useEffect, useState } from "react";
import { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson";

type ClippedFeature = Feature<
  Polygon | MultiPolygon,
  {
    team: string;
    color: string;
  }
>;

export default function NflMap() {
  const [voronoiRegions, setVoronoiRegions] =
    useState<FeatureCollection | null>(null);

  useEffect(() => {
    const generateMapData = async () => {
      // 1. Fetch the US states file
      const response = await fetch("/us-states.json");
      const usStates = (await response.json()) as FeatureCollection;

      // Create US outline by flattening and dissolving state shapes
      const flattened = turf.flatten(usStates);
      const dissolved = turf.dissolve(flattened);

      if (!dissolved.features.length) {
        console.error("Could not create a valid US outline.");
        return;
      }
      const usOutline = dissolved.features[0];

      // 2. Prepare stadium points
      const pointFeatures = stadiums.map((s) =>
        turf.point(s.coordinates, { team: s.team, color: s.color }),
      );
      const points = turf.featureCollection(pointFeatures);

      // 3. Calculate the Voronoi diagram
      const voronoi = geoVoronoi(points);
      const polygons = voronoi.polygons();

      // 4. Clip each Voronoi region
      const clippedRegions = polygons.features
        .filter(
          (feature) =>
            feature &&
            feature.geometry &&
            feature.geometry.coordinates &&
            feature.geometry.coordinates.length > 0 &&
            feature.geometry.coordinates[0].length > 0,
        )
        .map((feature: Feature<Polygon | MultiPolygon>) => {
          try {
            const clipped = turf.intersect(feature, usOutline);
            if (clipped && feature.properties && feature.properties.site) {
              clipped.properties = feature.properties.site.properties;
            }
            return clipped;
          } catch (e) {
            console.error("Error intersecting feature:", feature, e);
            return null;
          }
        })
        .filter(Boolean) as ClippedFeature[];

      setVoronoiRegions({
        type: "FeatureCollection",
        features: clippedRegions,
      });
    };

    generateMapData();
  }, []);

  // Style function for GeoJSON layers
  const styleFeature = (feature?: Feature) => {
    return {
      fillColor: feature?.properties?.color || "#cccccc",
      weight: 1,
      color: "white",
      fillOpacity: 0.7,
    };
  };

  return (
    <MapContainer
      center={[39.8283, -98.5795]}
      zoom={4}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {voronoiRegions && <GeoJSON data={voronoiRegions} style={styleFeature} />}
    </MapContainer>
  );
}

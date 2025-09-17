"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { geoVoronoi } from "d3-geo-voronoi";
import * as topojson from "topojson-client";
import { Topology } from "topojson-specification";
import { stadiums } from "@/data/stadiums";
import { Feature, FeatureCollection, Point } from "geojson";
import * as turf from "@turf/turf";

// Define the properties for our stadium points
interface StadiumProperties {
  team: string;
  stadium: string;
  city: string;
  teamCity: string;
  color: string;
}

// Filter for unique stadiums to avoid Voronoi conflicts
const uniqueStadiums = stadiums.filter(
  (stadium, index, self) =>
    index === self.findIndex((s) => s.stadium === stadium.stadium),
);

export default function NflMap() {
  // A ref to hold the SVG element
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const generateAndDrawMap = async () => {
      if (!svgRef.current) return;

      try {
        // --- Data Preparation ---
        const usTopology = (await d3.json(
          "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json",
        )) as Topology;

        const stadiumPoints: Feature<Point, StadiumProperties>[] =
          uniqueStadiums.map((s) => ({
            type: "Feature",
            properties: {
              team: s.team,
              stadium: s.stadium,
              city: s.city,
              teamCity: s.teamCity,
              color: s.color,
            },
            geometry: {
              type: "Point",
              coordinates: [s.coordinates[1], s.coordinates[0]],
            },
          }));
        const stadiumFeatureCollection = turf.featureCollection(stadiumPoints);
        const voronoiPolygons = geoVoronoi(stadiumFeatureCollection).polygons();

        // --- SVG Drawing ---
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous content

        const width = 975;
        const height = 610;
        svg.attr("viewBox", `0 0 ${width} ${height}`);

        const projection = d3
          .geoAlbersUsa()
          .fitSize(
            [width, height],
            topojson.feature(usTopology, usTopology.objects.states),
          );
        const pathGenerator = d3.geoPath(projection);

        // Define a clipping path to the US outline
        svg
          .append("clipPath")
          .attr("id", "map-clip")
          .append("path")
          .datum(topojson.feature(usTopology, usTopology.objects.states))
          .attr("d", pathGenerator);

        // Draw the colored Voronoi regions, clipped to the path
        svg
          .append("g")
          .attr("clip-path", "url(#map-clip)")
          .selectAll("path")
          .data(voronoiPolygons.features)
          .join("path")
          .attr("fill", (d: any) => d.properties.site.properties.color)
          .attr("fill-opacity", 0.8);

        // Draw the state borders
        svg
          .append("path")
          .datum(
            topojson.mesh(
              usTopology,
              usTopology.objects.states,
              (a, b) => a !== b,
            ),
          )
          .attr("fill", "none")
          .attr("stroke", "white")
          .attr("stroke-linejoin", "round");

        // Redraw all paths with the projection
        svg.selectAll("path").attr("d", pathGenerator);

        // Draw the black stadium dots on top
        svg
          .append("g")
          .selectAll("circle")
          .data(stadiums)
          .join("circle")
          .attr(
            "transform",
            (d) =>
              `translate(${projection([d.coordinates[1], d.coordinates[0]])})`,
          )
          .attr("r", 3)
          .attr("fill", "black")
          .attr("stroke", "white")
          .attr("stroke-width", 0.5);

        // Add city names above the dots
        svg
          .append("g")
          .selectAll("text")
          .data(stadiums)
          .join("text")
          .attr(
            "transform",
            (d) =>
              `translate(${projection([d.coordinates[1], d.coordinates[0]])})`,
          )
          .attr("dy", "-0.5em") // Position text above the dot
          .attr("text-anchor", "middle") // Center the text
          .style("font-size", "8px") // Make the font small
          .style("fill", "black")
          .style("paint-order", "stroke")
          .style("stroke", "white")
          .style("stroke-width", "2px")
          .style("stroke-linecap", "butt")
          .style("stroke-linejoin", "miter")
          .text((d) => d.teamCity); // Use teamCity for the label
      } catch (error) {
        console.error("Failed to generate and draw map:", error);
      }
    };

    generateAndDrawMap();
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <svg ref={svgRef}></svg>
    </div>
  );
}

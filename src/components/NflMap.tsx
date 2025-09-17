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
  logoUrl: string;
}

// Filter for unique stadiums to avoid Voronoi conflicts
const uniqueStadiums = stadiums.filter(
  (stadium, index, self) =>
    index === self.findIndex((s) => s.stadium === stadium.stadium),
);

export default function NflMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const generateAndDrawMap = async () => {
      if (!svgRef.current || !containerRef.current) return;

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
              logoUrl: s.logoUrl,
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
        svg.selectAll("*").remove();

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

        // --- Tooltip Setup ---
        const tooltip = d3
          .select(containerRef.current)
          .append("div")
          .attr(
            "class",
            "absolute text-center w-auto max-w-xs p-2 text-xs font-sans bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg pointer-events-none opacity-0 transition-opacity duration-200 flex flex-col items-center gap-2 shadow-lg",
          );

        svg
          .append("clipPath")
          .attr("id", "map-clip")
          .append("path")
          .datum(topojson.feature(usTopology, usTopology.objects.states))
          .attr("d", pathGenerator);

        svg
          .append("g")
          .attr("clip-path", "url(#map-clip)")
          .selectAll("path")
          .data(voronoiPolygons.features)
          .join("path")
          .attr("fill", (d: any) => d.properties.site.properties.color)
          .attr("fill-opacity", 0.8);

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

        svg.selectAll("path").attr("d", pathGenerator);

        // --- Stadium Dots with Tooltip Events ---
        svg
          .append("g")
          .selectAll("circle")
          .data(uniqueStadiums) // Use uniqueStadiums to avoid duplicate dots
          .join("circle")
          .attr(
            "transform",
            (d) =>
              `translate(${projection([d.coordinates[1], d.coordinates[0]])})`,
          )
          .attr("r", 3)
          .attr("fill", "black")
          .attr("stroke", "white")
          .attr("stroke-width", 0.5)
          .style("cursor", "pointer")
          .on("mouseover", (event, d) => {
            // Find all teams that share the same stadium
            const teamsInStadium = stadiums.filter(
              (s) => s.stadium === d.stadium,
            );

            // Build the tooltip HTML
            let tooltipHtml = `<span class="font-bold">${d.stadium}</span><div class="flex items-center justify-center gap-2">`;
            teamsInStadium.forEach((team) => {
              tooltipHtml += `
                <div class="flex flex-col items-center">
                  <img src="${team.logoUrl}" alt="${team.team} logo" class="w-[50px] h-auto" />
                  <span class="text-xs">${team.team}</span>
                </div>
              `;
            });
            tooltipHtml += `</div>`;

            tooltip.style("opacity", 1);
            tooltip.html(tooltipHtml);
          })
          .on("mousemove", (event) => {
            tooltip
              .style("left", event.pageX + 10 + "px")
              .style("top", event.pageY - 28 + "px");
          })
          .on("mouseout", () => {
            tooltip.style("opacity", 0);
          });

        svg
          .append("g")
          .selectAll("text")
          .data(uniqueStadiums) // Use uniqueStadiums to avoid duplicate labels
          .join("text")
          .attr(
            "transform",
            (d) =>
              `translate(${projection([d.coordinates[1], d.coordinates[0]])})`,
          )
          .attr("dy", "-0.5em")
          .attr("text-anchor", "middle")
          .style("font-size", "8px")
          .style("fill", "black")
          .style("paint-order", "stroke")
          .style("stroke", "white")
          .style("stroke-width", "2px")
          .style("stroke-linecap", "butt")
          .style("stroke-linejoin", "miter")
          .text((d) => d.teamCity);
      } catch (error) {
        console.error("Failed to generate and draw map:", error);
      }
    };

    generateAndDrawMap();

    return () => {
      d3.select(containerRef.current).select(".tooltip").remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
      }}
    >
      <svg ref={svgRef}></svg>
    </div>
  );
}

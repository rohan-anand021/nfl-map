"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { geoVoronoi } from "d3-geo-voronoi";
import * as topojson from "topojson-client";
import { Topology, GeometryObject } from "topojson-specification";
import { stadiums, Stadium } from "@/data/stadiums";
import { Feature, Point } from "geojson";
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

// Define the structure of the data that D3's geoVoronoi attaches
type VoronoiFeature = d3.GeoPermissibleObjects & {
  properties: {
    site: {
      properties: StadiumProperties;
    };
  };
};

// A combined type for the data passed to the event handlers
type HoverData = Stadium | VoronoiFeature;

// Filter for unique stadiums to avoid Voronoi conflicts
const uniqueStadiums = stadiums.filter(
  (stadium, index, self) =>
    index === self.findIndex((s) => s.stadium === stadium.stadium),
);

export default function NflMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const currentContainer = containerRef.current;

    const generateAndDrawMap = async () => {
      if (!svgRef.current || !currentContainer) return;

      try {
        const usTopology = (await d3.json(
          "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json",
        )) as Topology;

        const stadiumPoints: Feature<Point, StadiumProperties>[] =
          uniqueStadiums.map((s) => ({
            type: "Feature",
            properties: { ...s },
            geometry: {
              type: "Point",
              coordinates: [s.coordinates[1], s.coordinates[0]],
            },
          }));
        const stadiumFeatureCollection = turf.featureCollection(stadiumPoints);
        const voronoiPolygons = geoVoronoi(stadiumFeatureCollection).polygons();

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const width = 975;
        const height = 610;
        svg
          .attr("viewBox", `0 0 ${width} ${height}`)
          .attr("width", "100%")
          .attr("height", "100%");

        const projection = d3
          .geoAlbersUsa()
          .fitSize(
            [width, height],
            topojson.feature(usTopology, usTopology.objects.states),
          );
        const pathGenerator = d3.geoPath(projection);

        const tooltip = d3
          .select(currentContainer)
          .append("div")
          .attr(
            "class",
            "absolute text-center w-auto max-w-xs p-2 text-xs font-sans bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg pointer-events-none opacity-0 transition-opacity duration-200 flex flex-col items-center gap-2 shadow-lg",
          );

        const handleMouseOver = (event: MouseEvent, d: HoverData) => {
          const isStadium = (data: HoverData): data is Stadium =>
            (data as Stadium).stadium !== undefined;

          const stadiumName = isStadium(d)
            ? d.stadium
            : (d as VoronoiFeature).properties.site.properties.stadium;
          if (!stadiumName) return;

          const teamsInStadium = stadiums.filter(
            (s) => s.stadium === stadiumName,
          );
          let tooltipHtml = `<span class="font-bold">${stadiumName}</span><div class="flex items-center justify-center gap-2">`;
          teamsInStadium.forEach((team) => {
            tooltipHtml += `
                <div class="flex flex-col items-center">
                  <img src="${team.logoUrl}" alt="${team.team} logo" class="w-[50px] h-auto" />
                  <span class="text-xs">${team.team}</span>
                </div>`;
          });
          tooltipHtml += `</div>`;
          tooltip.style("opacity", 1).html(tooltipHtml);
        };

        const handleMouseMove = (event: MouseEvent) => {
          if (!currentContainer) return;
          const containerRect = currentContainer.getBoundingClientRect();
          const x = event.clientX - containerRect.left + 15;
          const y = event.clientY - containerRect.top - 28;
          tooltip.style("left", `${x}px`).style("top", `${y}px`);
        };

        const handleMouseOut = () => tooltip.style("opacity", 0);

        svg
          .append("clipPath")
          .attr("id", "map-clip")
          .append("path")
          .datum(topojson.feature(usTopology, usTopology.objects.states))
          // **FIXED**: Explicitly type 'd' to match what pathGenerator expects
          .attr("d", (d) => pathGenerator(d as d3.GeoPermissibleObjects) || "");

        svg
          .append("g")
          .attr("clip-path", "url(#map-clip)")
          .selectAll("path")
          .data(voronoiPolygons.features)
          .join("path")
          // **FIXED**: The data is known here, so we can cast 'd' to its specific type
          .attr("d", (d) => pathGenerator(d as VoronoiFeature) || "")
          .attr(
            "fill",
            (d) => (d as VoronoiFeature).properties.site.properties.color,
          )
          .attr("fill-opacity", 0.8)
          .style("cursor", "pointer")
          .on("mouseover", (event, d) => handleMouseOver(event, d as HoverData))
          .on("mousemove", handleMouseMove)
          .on("mouseout", handleMouseOut);

        svg
          .append("path")
          .datum(
            topojson.mesh(
              usTopology,
              usTopology.objects.states,
              (a: GeometryObject, b: GeometryObject) => a !== b,
            ),
          )
          .attr("fill", "none")
          .attr("stroke", "white")
          .attr("stroke-linejoin", "round")
          // **FIXED**: Explicitly type 'd' here as well
          .attr("d", (d) => pathGenerator(d as d3.GeoPermissibleObjects) || "");

        svg
          .append("g")
          .selectAll("circle")
          .data(uniqueStadiums)
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
          .on("mouseover", (event, d) => handleMouseOver(event, d as HoverData))
          .on("mousemove", handleMouseMove)
          .on("mouseout", handleMouseOut);

        svg
          .append("g")
          .selectAll("text")
          .data(uniqueStadiums)
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
          .text((d) => d.teamCity);
      } catch (error) {
        console.error("Failed to generate and draw map:", error);
      }
    };

    generateAndDrawMap();
    return () => {
      d3.select(currentContainer).select(".tooltip").remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
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

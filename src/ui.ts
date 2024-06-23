import countries110 from "./countries-110m.json";
import countries50 from "./countries-50m.json";
import countries110v from "./countries-110m-v.json";
import countries50v from "./countries-50m-v.json";
import * as topojson from "topojson-client";
import * as d3 from "d3";
import { ExtendedFeatureCollection } from "d3-geo";

const elem = document.querySelector('[data-target="globe"]');

/**
 * This learns from a lot of examples!
 * https://observablehq.com/@michael-keith/draggable-globe-in-d3
 */
const sphere = { type: "Sphere" } as const;
const width = 300;
const sensitivity = 75;

const datasets = {
  naturalearth: {
    lo: topojson.feature(
      countries110 as any,
      countries110.objects.countries as any,
    ) as unknown as ExtendedFeatureCollection,
    hi: topojson.feature(
      countries50 as any,
      countries50.objects.countries as any,
    ) as unknown as ExtendedFeatureCollection,
  },
  visionscarto: {
    lo: topojson.feature(
      countries110v as any,
      countries110v.objects.countries as any,
    ) as unknown as ExtendedFeatureCollection,
    hi: topojson.feature(
      countries50v as any,
      countries50v.objects.countries as any,
    ) as unknown as ExtendedFeatureCollection,
  },
} as const;

// State
let dataset = datasets.visionscarto;
let showGraticules = false;

document
  .querySelector('[data-target="graticule-checkbox"]')!
  .addEventListener("change", (e) => {
    showGraticules = !!(e.target as HTMLInputElement).checked;
    render({ update: true, dragging: false });
  });

document
  .querySelector('[data-target="dataset-selector"]')!
  .addEventListener("change", (e) => {
    const value = (e.target as HTMLSelectElement).value;
    dataset = datasets[value] || dataset;
    render({ update: true, dragging: false });
  });

const graticule = d3.geoGraticule();

const projection = d3.geoOrthographic().precision(0.1);

const [[x0, y0], [x1, y1]] = d3
  .geoPath(projection.fitWidth(width, sphere))
  .bounds(sphere);

const dy = Math.ceil(y1 - y0),
  l = Math.min(Math.ceil(x1 - x0), dy);
projection.scale((projection.scale() * (l - 1)) / l).precision(0.2);

const path = d3.geoPath(projection);

function render({
  update,
  dragging = false,
}: {
  update: boolean;
  dragging?: boolean;
}) {
  const contentRoot = d3.select(elem).select("g#content").node();

  d3.select(contentRoot)
    .selectAll("path.graticule")
    .data([graticule()])
    .join("path")
    .attr("class", "graticule")
    .attr("stroke", "#ccc")
    .attr("stroke-width", "1")
    .attr("fill", "none")
    .attr("d", path as any);

  d3.select(contentRoot)
    .selectAll("path.country")
    .data(
      dragging ? dataset.lo.features : dataset.hi.features,
      (feature: any) => {
        return feature.id;
      },
    )
    .join("path")
    .attr("class", "country")
    .attr("stroke", "#fff")
    .attr("stroke-width", "0.5")
    .attr("fill", "#0D99FF")
    .attr("d", path as any);

  if (update) {
    parent.postMessage(
      {
        pluginMessage: {
          type: "CREATE",
          graticules:
            showGraticules &&
            graticule().coordinates.flatMap((coordinates) => {
              const d = path({
                type: "LineString",
                coordinates,
              });
              return d ? [d] : [];
            }),
          features: dataset.hi.features.flatMap((f) => {
            // Countries with multiple polygons should be separate
            // shapes. d3 will generate complex polygons here - we
            // want to instead generate a group in Figma.
            if (f.geometry?.type === "MultiPolygon") {
              const d = f.geometry.coordinates
                .map((coordinates) => {
                  return path({
                    type: "Polygon",
                    coordinates,
                  });
                })
                .filter(Boolean);
              // If this country is entirely obscured,
              // don't send it.
              if (!d.length) return [];
              // If there was only one visible element,
              // don't create a group.
              if (d.length === 1) {
                return {
                  d: d[0],
                  name: f.properties?.name,
                };
              }
              return {
                d: d,
                name: f.properties?.name,
              };
            } else {
              const d = path(f);
              if (d) {
                return { d, name: f.properties?.name };
              } else {
                return [];
              }
            }
          }) as any,
        },
      },
      "*",
    );
  }
}

d3.select(elem)
  .call((el) => {
    el.append("path")
      .datum(sphere)
      .attr("stroke", "none")
      .attr("fill", "#F5F5F5")
      .attr("d", path);

    el.append("g").attr("id", "content");

    el.append("path")
      .datum(sphere)
      .attr("class", "sphere-stroke")
      .attr("stroke", "#383838")
      .attr("stroke-width", "1")
      .attr("fill", "transparent")
      .attr("d", path);
  })
  .call(
    d3
      .drag()
      .on("drag", (event) => {
        const rotate = projection.rotate();
        const k = sensitivity / projection.scale();
        projection.rotate([rotate[0] + event.dx * k, rotate[1] - event.dy * k]);
        render({ update: false, dragging: true });
      })
      .on("end", () => {
        render({ update: true });
      }) as any,
  )
  .call(() => {
    // initial render!
    render({ update: true });
  })
  .node();

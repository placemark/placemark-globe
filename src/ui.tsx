import { Container, render, VerticalSpace } from "@create-figma-plugin/ui";
// import land110 from "./land-110m.json";
// import land50 from "./land-50m.json";
import countries110 from "./countries-110m.json";
import countries50 from "./countries-50m.json";
import { emit } from "@create-figma-plugin/utilities";
import { h } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import * as topojson from "topojson-client";
import * as d3 from "d3";
import { CreateHandler } from "./types";
import { ExtendedFeatureCollection } from "d3-geo";

/**
 * This learns from a lot of examples!
 * https://observablehq.com/@michael-keith/draggable-globe-in-d3
 */
const sphere = { type: "Sphere" } as const;
const width = 300;
const sensitivity = 75;

const countriesHi = topojson.feature(
  countries110,
  countries110.objects.countries,
) as unknown as ExtendedFeatureCollection;

const countriesLo = topojson.feature(
  countries50,
  countries50.objects.countries,
) as unknown as ExtendedFeatureCollection;

function Plugin() {
  const projection = useMemo(() => {
    const projection = d3.geoOrthographic().precision(0.1);

    const [[x0, y0], [x1, y1]] = d3
      .geoPath(projection.fitWidth(width, sphere))
      .bounds(sphere);

    const dy = Math.ceil(y1 - y0),
      l = Math.min(Math.ceil(x1 - x0), dy);
    projection.scale((projection.scale() * (l - 1)) / l).precision(0.2);
    return projection;
  }, []);

  const path = useMemo(() => d3.geoPath(projection), []);
  const elemRef = useRef<SVGSVGElement | null>(null);

  function render(
    elem: SVGSVGElement,
    {
      update,
      dragging = false,
    }: {
      update: boolean;
      dragging?: boolean;
    },
  ) {
    d3.select(d3.select(elem).select("g#content").node())
      .selectAll("path.country")
      .data(
        dragging ? countriesLo.features : countriesHi.features,
        (feature) => {
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
      emit<CreateHandler>(
        "CREATE",
        countriesLo.features.flatMap((f) => {
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
      );
    }
  }

  useEffect(() => {
    if (elemRef.current) {
      const elem = elemRef.current;
      d3.select(elem).html("");

      d3.select(elem)
        .call((el) => {
          el.append("path")
            .datum(sphere)
            .attr("stroke", "none")
            .attr("fill", "#F5F5F5")
            .attr("d", path);

          /**
           * This is targeted indirectly.
           */
          const contentG = el.append("g").attr("id", "content");

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
              projection.rotate([
                rotate[0] + event.dx * k,
                rotate[1] - event.dy * k,
              ]);
              render(elem, { update: false, dragging: true });
            })
            .on("end", () => {
              render(elem, { update: true });
            }) as any,
        )
        .call(() => {
          // initial render!
          render(elem, { update: true });
        })
        .node();
    }
  }, [elemRef.current]);

  /*
  const countryOptions: DropdownOption[] = [
    ...[{ header: "Zoom to country" }],
    ...countries.features
      .map((c) => {
        return c.properties?.name;
      })
      .filter(Boolean)
      .sort()
      .map((name) => {
        return { value: name as string };
      }),
  ];
  */

  return (
    <Container space="medium">
      <VerticalSpace space="large" />
      <VerticalSpace space="small" />
      <svg width={300} height={300} ref={elemRef}></svg>
      <VerticalSpace space="extraLarge" />
    </Container>
  );
}

export default render(Plugin);

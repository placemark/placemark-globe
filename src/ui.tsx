import {
  Button,
  Columns,
  Container,
  render,
  VerticalSpace,
} from "@create-figma-plugin/ui";
import land110 from "./land-110m.json";
import countries110 from "./countries-110m.json";
import { emit } from "@create-figma-plugin/utilities";
import { h } from "preact";
import { useCallback, useState } from "preact/hooks";
import versor from "versor";
import * as topojson from "topojson-client";
import * as d3 from "d3";

import { CloseHandler, CreateHandler } from "./types";
import { ExtendedFeatureCollection } from "d3-geo";

const sphere = { type: "Sphere" } as const;
const width = 300;

const land = topojson.feature(land110, land110.objects.land);
const countries = topojson.feature(
  countries110,
  countries110.objects.countries,
) as unknown as ExtendedFeatureCollection;

// TODO: types…
function drag(projection: any) {
  let v0: any, q0: any, r0: any;

  function dragstarted({ x, y }: any) {
    v0 = versor.cartesian(projection.invert([x, y]));
    q0 = versor((r0 = projection.rotate()));
  }

  function dragged({ x, y }: any) {
    const v1 = versor.cartesian(projection.rotate(r0).invert([x, y]));
    const q1 = versor.multiply(q0, versor.delta(v0, v1));
    projection.rotate(versor.rotation(q1));
  }

  return d3.drag().on("start", dragstarted).on("drag", dragged);
}

function Plugin() {
  const handleCloseButtonClick = useCallback(function () {
    emit<CloseHandler>("CLOSE");
  }, []);

  function globeRef(elem: SVGSVGElement | null) {
    // This is based off of Versor Dragging:
    // https://observablehq.com/d/569d101dd5bd332b
    if (elem) {
      const projection = d3.geoOrthographic().precision(0.1);

      const [[x0, y0], [x1, y1]] = d3
        .geoPath(projection.fitWidth(width, sphere))
        .bounds(sphere);
      const dy = Math.ceil(y1 - y0),
        l = Math.min(Math.ceil(x1 - x0), dy);
      projection.scale((projection.scale() * (l - 1)) / l).precision(0.2);
      const path = d3.geoPath(projection);

      const render = (update: boolean = false) => {
        d3.select(elem)
          .selectAll("path.land")
          .attr("d", path as any);
        d3.select(elem)
          .selectAll("path.country")
          .attr("d", path as any);
        if (update) {
          emit<CreateHandler>(
            "CREATE",
            countries.features.flatMap((f) => {
              const p = path(f);
              if (p) {
                return { d: path(f), name: f.properties?.name };
              } else {
                return [];
              }
            }) as any,
          );
        }
      };

      d3.select(elem)
        .call((el) => {
          el.append("path")
            .datum(sphere)
            .attr("stroke", "#fff")
            .attr("fill", "#000")
            .attr("d", path);
          el.append("path")
            .datum(land)
            .attr("class", "land")
            .attr("stroke", "#fff")
            .attr("fill", "#222")
            .attr("d", path);
          el.selectAll("path.country")
            .data(countries.features)
            .join("path")
            .attr("class", "country")
            .attr("stroke", "#fff")
            .attr("fill", "#222")
            .attr("d", path);
        })
        .call(
          drag(projection)
            .on("drag.render", () => render())
            .on("end.render", () => render(true)),
        )
        .call(() => render(true))
        .node();
    }
  }

  return (
    <Container space="medium">
      <VerticalSpace space="large" />
      <VerticalSpace space="small" />
      <svg width={300} height={300} ref={globeRef}></svg>
      <VerticalSpace space="extraLarge" />
      <Columns space="extraSmall">
        <Button fullWidth onClick={handleCloseButtonClick} secondary>
          Close
        </Button>
      </Columns>
      <VerticalSpace space="small" />
    </Container>
  );
}

export default render(Plugin);

import {
  Button,
  Columns,
  Container,
  Dropdown,
  DropdownOption,
  render,
  Text,
  Toggle,
  VerticalSpace,
} from "@create-figma-plugin/ui";
// import land110 from "./land-110m.json";
import countries110 from "./countries-110m.json";
import land50 from "./land-50m.json";
import countries50 from "./countries-50m.json";
import { emit } from "@create-figma-plugin/utilities";
import { h, JSX } from "preact";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import versor from "versor";
import * as topojson from "topojson-client";
import * as d3 from "d3";

import { CloseHandler, CreateHandler } from "./types";
import { ExtendedFeatureCollection } from "d3-geo";

const sphere = { type: "Sphere" } as const;
const width = 300;

// const landRes = topojson.feature(land110, land110.objects.land);
const countriesRes = topojson.feature(
  countries110,
  countries110.objects.countries,
) as unknown as ExtendedFeatureCollection;

const land = topojson.feature(land50, land50.objects.land);
const countries = topojson.feature(
  countries50,
  countries50.objects.countries,
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
  const [hires, setHires] = useState(true);
  const [graticule, setGraticule] = useState(true);

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

  function render(elem: SVGSVGElement, hires = false, update: boolean = false) {
    d3.select(elem)
      .selectAll("path.land")
      .attr("d", path as any);
    d3.select(elem)
      .selectAll("path.country")
      .attr("d", path as any);
    d3.select(elem)
      .selectAll("path.graticule")
      .attr("d", path as any);
    if (update) {
      const graticulePath = graticule ? path(d3.geoGraticule()()) : null;
      emit<CreateHandler>(
        "CREATE",
        (hires ? countries : countriesRes).features.flatMap((f) => {
          const p = path(f);
          if (p) {
            return { d: path(f), name: f.properties?.name };
          } else {
            return [];
          }
        }) as any,
        graticulePath,
      );
    }
  }

  const handleCloseButtonClick = useCallback(function () {
    emit<CloseHandler>("CLOSE");
  }, []);

  useEffect(() => {
    // This is based off of Versor Dragging:
    // https://observablehq.com/d/569d101dd5bd332b
    if (elemRef.current) {
      const elem = elemRef.current;
      d3.select(elem).html("");

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
          el.append("path")
            .datum(d3.geoGraticule())
            .attr("class", "graticule")
            .attr("stroke", "#222")
            .attr("fill", "none")
            .attr("d", path);
          el.selectAll("path.country")
            .data(countriesRes.features)
            .join("path")
            .attr("class", "country")
            .attr("stroke", "#fff")
            .attr("fill", "#222")
            .attr("d", path);
        })
        .call(
          drag(projection)
            .on("drag.render", () => render(elem, hires, false))
            .on("end.render", () => render(elem, hires, true)) as any,
        )
        .call(() => render(elem, hires, true))
        .node();
    }
  }, [elemRef.current]);

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

  return (
    <Container space="medium">
      <VerticalSpace space="large" />
      <VerticalSpace space="small" />
      <svg width={300} height={300} ref={elemRef}></svg>
      <VerticalSpace space="extraLarge" />
      <Toggle
        onChange={function (event: JSX.TargetedEvent<HTMLInputElement>) {
          setHires(event.currentTarget.checked);
        }}
        value={hires}
      >
        <Text>High resolution</Text>
      </Toggle>
      <VerticalSpace space="small" />
      <Toggle
        onChange={function (event: JSX.TargetedEvent<HTMLInputElement>) {
          setGraticule(event.currentTarget.checked);
        }}
        value={graticule}
      >
        <Text>Graticule lines</Text>
      </Toggle>
      <VerticalSpace space="small" />
      <Dropdown
        placeholder="Zoom to country"
        onChange={(e) => {
          const name = (e.target as HTMLSelectElement).value;
          const country = countries.features.find((c) => {
            return c.properties?.name === name;
          });
          if (!country) return;
          const centroid = d3.geoCentroid(country);
          projection.angle(0);
          projection.rotate([-centroid[0], -centroid[1]]);
          if (!elemRef.current) return;
          render(elemRef.current, hires, true);
        }}
        value={null}
        options={countryOptions}
      />
      <VerticalSpace space="small" />
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

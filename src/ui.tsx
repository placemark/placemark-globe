import { Container, render, VerticalSpace } from "@create-figma-plugin/ui";
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
import * as topojson from "topojson-client";
import * as d3 from "d3";
import { CloseHandler, CreateHandler } from "./types";
import { ExtendedFeatureCollection } from "d3-geo";

/**
 * This learns from a lot of examples!
 * https://observablehq.com/@michael-keith/draggable-globe-in-d3
 */

const sphere = { type: "Sphere" } as const;
const width = 300;
const sensitivity = 75;

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

function Plugin() {
  const [hires, setHires] = useState(true);
  const [graticule, setGraticule] = useState(false);

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
    /*
    d3.select(elem)
      .selectAll("path.land")
      .attr("d", path as any);
      */
    d3.select(d3.select(elem).select("g#content").node())
      .selectAll("path.country")
      .data(
        dragging ? countries.features : countriesRes.features,
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
    /*
    d3.select(elem)
      .selectAll("path.graticule")
      .attr("d", path as any);
      */
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
            .attr("stroke", "none")
            .attr("fill", "#F5F5F5")
            .attr("d", path);
          const contentG = el.append("g").attr("id", "content");
          /*
          contentG
            .append("path")
            .datum(land)
            .attr("class", "land")
            .attr("fill", "#0D99FF")
            .attr("d", path);
            */
          /*
          el.append("path")
            .datum(d3.geoGraticule())
            .attr("class", "graticule")
            .attr("stroke", "#222")
            .attr("fill", "none")
            .attr("d", path);
            */
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
      {/*
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
      */}
      {/*
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
      */}
    </Container>
  );
}

export default render(Plugin);

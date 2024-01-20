import { on, once, showUI } from "@create-figma-plugin/utilities";

import { CloseHandler, CreateHandler } from "./types";

function transformD(d: string) {
  const data = d
    .replace(/,/g, " ")
    .replace(/(L|M|Z)/g, " $1 ")
    .trim();
  return data
    .split("Z")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s + " Z").trim());
}

export default function () {
  const frame = figma.createFrame();
  frame.name = "Globe";
  frame.resize(300, 300);
  figma.currentPage.appendChild(frame);
  figma.viewport.scrollAndZoomIntoView([frame]);

  const countryFillStyle = putColorPaint("country-fill", "rgb(13, 153, 255)");
  const countryStrokeStyle = putColorPaint(
    "country-stroke",
    "rgb(255, 255, 255)",
  );

  function putColorPaint(
    name: string,
    color: Parameters<typeof figma.util.rgb>[0],
    opacity: number = 1,
  ) {
    const styles = figma.getLocalPaintStyles();

    let existing = styles.find((style) => {
      return style.name === name;
    });
    if (existing) return existing;

    const style = figma.createPaintStyle();
    style.name = name;
    style.paints = [
      {
        color: figma.util.rgb(color),
        opacity,
        type: "SOLID",
      },
    ];
    return style;
  }

  function makeCountryVector(d: string, name: string) {
    let vec = figma.createVector();
    vec.vectorPaths = transformD(d).map((data) => {
      return {
        windingRule: "EVENODD",
        data,
      };
    });
    vec.strokeStyleId = countryStrokeStyle.id;
    vec.strokeWeight = 0.5;
    vec.strokeAlign = "OUTSIDE";
    vec.fillStyleId = countryFillStyle.id;
    vec.constraints = { horizontal: "SCALE", vertical: "SCALE" };
    vec.setPluginData("globe-id", name);
    vec.name = name;
    return vec;
  }

  on<CreateHandler>("CREATE", function (features) {
    const nodes: Array<SceneNode> = [];
    frame.children.forEach((child) => {
      child.remove();
    });

    /**
     * Create the globe
     * --------------------------------------------------------------------------
     */
    const globe = figma.createEllipse();
    globe.resize(300, 300);
    globe.strokes = [];
    globe.fills = [
      {
        color: figma.util.rgb("rgb(245, 245, 245)"),
        type: "SOLID",
      },
    ];
    globe.constraints = { horizontal: "SCALE", vertical: "SCALE" };
    frame.appendChild(globe);

    for (const feature of features) {
      if (Array.isArray(feature.d)) {
        const vecs = feature.d.map((d) => {
          const vec = makeCountryVector(d, feature.name);
          nodes.push(vec);
          return vec;
        });

        const g = figma.group(vecs, frame);
        g.name = feature.name;
      } else {
        const vec = makeCountryVector(feature.d, feature.name);
        frame.appendChild(vec);
        nodes.push(vec);
      }
    }
    const rim = figma.createEllipse();
    rim.resize(300, 300);
    rim.strokes = [
      {
        color: figma.util.rgb("rgb(100, 100, 100)"),
        type: "SOLID",
      },
    ];
    rim.fills = [];
    rim.constraints = { horizontal: "SCALE", vertical: "SCALE" };
    frame.appendChild(rim);
    frame.setPluginData("rendered", "true");
  });
  once<CloseHandler>("CLOSE", function () {
    figma.closePlugin();
  });
  showUI({
    height: 375,
    width: 340,
  });
}

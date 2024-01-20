import { on, once, showUI } from "@create-figma-plugin/utilities";

import { CloseHandler, CreateHandler } from "./types";

export default function () {
  const frame = figma.createFrame();
  frame.name = "Globe";
  frame.resize(300, 300);
  figma.currentPage.appendChild(frame);
  figma.viewport.scrollAndZoomIntoView([frame]);

  /**
   * Create the globe
   * --------------------------------------------------------------------------
   */
  const globe = figma.createEllipse();
  globe.resize(300, 300);
  globe.strokes = [
    {
      color: figma.util.rgb("rgb(100, 100, 100)"),
      type: "SOLID",
    },
  ];
  globe.fills = [
    {
      color: figma.util.rgb("rgb(245, 245, 245)"),
      type: "SOLID",
    },
  ];
  globe.constraints = { horizontal: "SCALE", vertical: "SCALE" };
  frame.appendChild(globe);

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

  on<CreateHandler>("CREATE", function (features) {
    const nodes: Array<SceneNode> = [];
    frame.children.forEach((child) => {
      if (child.getPluginData("globe-id")) {
        child.remove();
      }
    });

    for (const feature of features) {
      let vec = figma.createVector();

      const data = feature.d
        .replace(/,/g, " ")
        .replace(/(L|M|Z)/g, " $1 ")
        .trim();
      const paths = data
        .split("Z")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => (s + " Z").trim());
      vec.vectorPaths = paths.map((data) => {
        return {
          windingRule: "EVENODD",
          data,
        };
      });
      vec.strokeStyleId = countryStrokeStyle.id;
      vec.fillStyleId = countryFillStyle.id;
      vec.constraints = { horizontal: "SCALE", vertical: "SCALE" };
      vec.setPluginData("globe-id", feature.name);
      vec.name = feature.name;
      frame.appendChild(vec);
      nodes.push(vec);
    }
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

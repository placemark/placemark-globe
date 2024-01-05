import { on, once, showUI } from "@create-figma-plugin/utilities";

import { CloseHandler, CreateHandler } from "./types";

export default function () {
  const frame = figma.createFrame();
  frame.name = "Globe";
  frame.resize(300, 300);
  figma.currentPage.appendChild(frame);
  figma.viewport.scrollAndZoomIntoView([frame]);

  const globe = figma.createEllipse();
  globe.resize(300, 300);
  frame.appendChild(globe);

  on<CreateHandler>("CREATE", function (features, graticule) {
    const nodes: Array<SceneNode> = [];
    frame.children.forEach((child) => {
      if (child.getPluginData("globe-id")) {
        child.remove();
      }
    });

    if (graticule) {
      let vec = figma.createVector();

      vec.setPluginData("globe-id", "graticule");

      const data = graticule
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
      vec.strokes = [
        {
          color: { b: 0.5, g: 0.5, r: 0.5 },
          type: "SOLID",
        },
      ];
      frame.appendChild(vec);
    }

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
      vec.fills = [
        {
          color: { b: 0.9, g: 0.4, r: 0.4 },
          type: "SOLID",
        },
      ];
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
    height: 475,
    width: 340,
  });
}

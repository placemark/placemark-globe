figma.showUI(__html__, {
  height: 460,
  width: 340,
});

function transformDLine(d: string) {
  const data = d
    .replace(/,/g, " ")
    .replace(/(L|M|Z)/g, " $1 ")
    .trim();
  return data
    .split("Z")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.trim());
}

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

const frame = figma.createFrame();
frame.name = "Globe";
frame.resize(300, 300);
figma.currentPage.appendChild(frame);
figma.viewport.scrollAndZoomIntoView([frame]);

let existingPaints = new Map();

async function putColorPaint(
  name: string,
  color: Parameters<typeof figma.util.rgb>[0],
  opacity: number = 1,
) {
  const styles = await figma.getLocalPaintStylesAsync();

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

async function makeGraticuleVector(d: string) {
  const graticuleStrokeStyle = await putColorPaint(
    "graticule-stroke",
    "rgb(200, 200, 200)",
  );
  const vec = figma.createVector();
  vec.vectorPaths = transformDLine(d).map((data) => {
    return {
      windingRule: "EVENODD",
      data,
    };
  });
  await vec.setStrokeStyleIdAsync(graticuleStrokeStyle.id);
  vec.strokeWeight = 0.5;
  vec.strokeAlign = "OUTSIDE";
  vec.constraints = { horizontal: "SCALE", vertical: "SCALE" };
  vec.name = "Graticule";
  return vec;
}

async function makeCountryVector(d: string, name: string) {
  const countryFillStyle = await putColorPaint(
    "country-fill",
    "rgb(13, 153, 255)",
  );
  const countryStrokeStyle = await putColorPaint(
    "country-stroke",
    "rgb(255, 255, 255)",
  );
  const vec = figma.createVector();
  vec.vectorPaths = transformD(d).map((data) => {
    return {
      windingRule: "EVENODD",
      data,
    };
  });
  await vec.setStrokeStyleIdAsync(countryStrokeStyle.id);
  vec.strokeWeight = 0.5;
  vec.strokeAlign = "OUTSIDE";
  await vec.setFillStyleIdAsync(countryFillStyle.id);
  vec.constraints = { horizontal: "SCALE", vertical: "SCALE" };
  vec.setPluginData("globe-id", name);
  vec.name = name;
  return vec;
}

figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case "CREATE": {
      const features = msg.features;
      const graticules = msg.graticules;
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

      if (graticules) {
        const graticuleVecs = [];

        for (const line of graticules) {
          const graticuleVec = await makeGraticuleVector(line);
          frame.appendChild(graticuleVec);
          graticuleVecs.push(graticuleVec);
        }
        const g = figma.group(graticuleVecs, frame);
        g.name = "Graticule";
        g.expanded = false;
      }

      for (const feature of features) {
        if (Array.isArray(feature.d)) {
          const vecs = [];
          for (let d of feature.d) {
            const vec = await makeCountryVector(d, feature.name);
            nodes.push(vec);
            vecs.push(vec);
          }

          const g = figma.group(vecs, frame);
          g.expanded = false;
          g.name = feature.name;
        } else {
          const vec = await makeCountryVector(feature.d, feature.name);
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
    }
  }
};

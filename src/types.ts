import { EventHandler } from "@create-figma-plugin/utilities";

type Shape = { d: string | string[]; name: string };

export interface CreateHandler extends EventHandler {
  name: "CREATE";
  handler: (shapes: Shape[]) => void;
}

export interface CloseHandler extends EventHandler {
  name: "CLOSE";
  handler: () => void;
}

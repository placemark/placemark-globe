import { EventHandler } from "@create-figma-plugin/utilities";

export interface CreateHandler extends EventHandler {
  name: "CREATE";
  handler: (shapes: { d: string; name: string }[]) => void;
}

export interface CloseHandler extends EventHandler {
  name: "CLOSE";
  handler: () => void;
}

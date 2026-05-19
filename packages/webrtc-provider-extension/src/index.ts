import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from "@jupyterlab/application";

import { IWebSocketFactory } from "jupyter-webrtc-provider";

const PLUGIN_ID = "jupyter-webrtc-provider";

export const webSocketFactoryPlugin: JupyterFrontEndPlugin<IWebSocketFactory> =
  {
    id: PLUGIN_ID + "-websocket-factory",
    description: "Provides a WebSocket factory for signaling connections.",
    requires: [],
    optional: [],
    provides: IWebSocketFactory,
    activate: async (app: JupyterFrontEnd) => {
      return (url: string) => new WebSocket(url);
    },
  };

const plugins: JupyterFrontEndPlugin<unknown>[] = [webSocketFactoryPlugin];

export default plugins;

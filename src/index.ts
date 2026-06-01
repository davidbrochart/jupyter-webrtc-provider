export { IWebSocketFactory } from './websocket';

import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import {
  awarenessProviderFactoryPlugin,
  documentProviderFactoryPlugin,
  IWebSocketRoomIdFactory
} from './provider';

export {
  awarenessProviderFactoryPlugin,
  documentProviderFactoryPlugin,
  IWebSocketRoomIdFactory
};

const plugins: JupyterFrontEndPlugin<unknown>[] = [
  documentProviderFactoryPlugin,
  awarenessProviderFactoryPlugin
];

export default plugins;

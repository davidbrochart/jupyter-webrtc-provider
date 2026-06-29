export { IWebSocketFactory } from './websocket';
export { IRoomIdManager } from './roomid';
export { IAcceptUser } from './acceptuser';

import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import {
  awarenessProviderFactoryPlugin,
  documentProviderFactoryPlugin
} from './provider';

import { roomIdManagerPlugin } from './roomid';

export { awarenessProviderFactoryPlugin, documentProviderFactoryPlugin };

const plugins: JupyterFrontEndPlugin<unknown>[] = [
  documentProviderFactoryPlugin,
  awarenessProviderFactoryPlugin,
  roomIdManagerPlugin
];

export default plugins;

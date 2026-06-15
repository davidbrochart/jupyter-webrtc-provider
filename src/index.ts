export { IWebSocketFactory } from './websocket';
export { IRoomIdManager } from './roomid';
export { IAcceptMessageFromUser } from './acceptmessage';

import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import {
  awarenessProviderFactoryPlugin,
  documentProviderFactoryPlugin
} from './provider';

export { awarenessProviderFactoryPlugin, documentProviderFactoryPlugin };

const plugins: JupyterFrontEndPlugin<unknown>[] = [
  documentProviderFactoryPlugin,
  awarenessProviderFactoryPlugin
];

export default plugins;

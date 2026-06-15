import { ServerConnection, User } from '@jupyterlab/services';

import { IAwareness } from '@jupyter/ydoc';

import { IWebSocketFactory } from './websocket';
import { WebrtcProvider } from './webrtc';
import { IRoomIdManager } from './roomid';

export interface IContent {
  type: string;
  body: string;
}

/**
 * A class to provide Yjs synchronization over WebRTC.
 *
 */
export class WebRTCAwarenessProvider extends WebrtcProvider {
  /**
   * Construct a new WebRTCAwarenessProvider
   *
   * @param options The instantiation options for a WebRTCAwarenessProvider
   */
  constructor(options: WebRTCAwarenessProvider.IOptions) {
    super(options.roomID, options.awareness.doc, {
      signaling: options.signalingServers,
      awareness: options.awareness,
      webSocketFactory: options.webSocketFactory,
      roomIdManager: options.roomIdManager,
      userId: options.userId,
      acceptUser: options.acceptUser
    });
    this.awareness = options.awareness;
    this._user = options.user;
    this._user.ready
      .then(() => this._onUserChanged(this._user))
      .catch(e => console.error(e));
    this._user.userChanged.connect(this._onUserChanged, this);
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._user.userChanged.disconnect(this._onUserChanged, this);
    this._isDisposed = true;
    this.destroy();
  }

  private _onUserChanged(user: User.IManager): void {
    const identity = user.identity!;
    this.userId = identity.username;
    this.awareness.setLocalStateField('user', identity);
  }

  readonly awareness: IAwareness;
  private _isDisposed = false;
  private _user: User.IManager;
}

/**
 * A namespace for WebRTCAwarenessProvider statics.
 */
export namespace WebRTCAwarenessProvider {
  /**
   * The instantiation options for a WebRTCAwarenessProvider.
   */
  export interface IOptions {
    /**
     * The room ID
     */
    roomID: string;

    /**
     * The awareness object
     */
    awareness: IAwareness;

    /**
     * The user data
     */
    user: User.IManager;

    /**
     * The server settings.
     */
    serverSettings?: ServerConnection.ISettings;

    /**
     * The signaling server URLs for WebRTC.
     */
    signalingServers: string[];

    /**
     * Factory function to create WebSocket connections.
     */
    webSocketFactory: IWebSocketFactory;

    /**
     * Room ID manager
     */
    roomIdManager: IRoomIdManager;

    /**
     * User ID of the local peer, sent in announce messages.
     */
    userId?: string;

    /**
     * Callback to check whether updates from a remote peer should be applied.
     * Called with the remote peer's userId. Return `true` to allow, `false` to deny.
     */
    acceptUser?: (userId: string | null) => Promise<boolean>;
  }
}

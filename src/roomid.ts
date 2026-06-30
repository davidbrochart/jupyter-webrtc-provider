import { Token } from '@lumino/coreutils';
import type { JupyterFrontEndPlugin } from '@jupyterlab/application';

export const IRoomIdManager = new Token<IRoomIdManager>(
  'jupyter-webrtc-provider:room-id-manager'
);

export type IRoomIdManager = {
  /**
   * Compute the roomId given the format, contentType and path
   * @param format
   * @param contentType
   * @param path
   */
  getRoomId(format: string, contentType: string, path: string): Promise<string>;

  /**
   * Get the format, contentType and path from the roomID
   * @param roomId the room id
   */
  parseRoomId(roomId: string): Promise<{
    format: string;
    contentType: string;
    path: string;
  } | null>;
};

export const DEFAULT_ROOM_ID_MANAGER: IRoomIdManager = {
  getRoomId: async (format: string, contentType: string, path: string) =>
    `${format}:${contentType}:${path}`,
  parseRoomId: async (roomId: string) => {
    const split = roomId.split(':');

    if (split.length !== 3) {
      return null;
    }

    return {
      format: split[0],
      contentType: split[1],
      path: split[2]
    };
  }
};

export const roomIdManagerPlugin: JupyterFrontEndPlugin<IRoomIdManager> = {
  id: 'jupyter-webrtc-provider:room-id-manager',
  description: 'Provides a room id manager for the WebRTC provider.',
  requires: [],
  optional: [],
  provides: IRoomIdManager,
  activate: () => DEFAULT_ROOM_ID_MANAGER
};

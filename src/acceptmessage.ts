import { Token } from '@lumino/coreutils';

export const IAcceptMessageFromUser = new Token<IAcceptMessageFromUser>(
  'jupyter-webrtc-provider:accept-message-from-user'
);

export type IAcceptMessageFromUser = (userId: string | null) => boolean;

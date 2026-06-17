import { Token } from '@lumino/coreutils';

export const IAcceptUser = new Token<IAcceptUser>(
  'jupyter-webrtc-provider:accept-user'
);

export type IAcceptUser = (userId: string | null) => Promise<boolean>;

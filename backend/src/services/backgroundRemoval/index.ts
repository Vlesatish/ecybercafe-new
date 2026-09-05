export * from './types.js';
export * from './PhotoRoomProvider.js';
export * from './LocalFallbackProvider.js';

import { BackgroundRemovalProvider } from './types.js';
import { PhotoRoomProvider } from './PhotoRoomProvider.js';
import { LocalFallbackProvider } from './LocalFallbackProvider.js';

export function getBackgroundRemovalProvider(): BackgroundRemovalProvider {
  if (process.env.USE_LOCAL_RMBG === 'true') {
    return new LocalFallbackProvider();
  }
  return new PhotoRoomProvider();
}

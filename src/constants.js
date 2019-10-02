import { electronImport } from './utils/electron';

const platformFolders = electronImport('platform-folders');
const path = electronImport('path');

export const API_VERSION = 11;
export const DEFAULT_HOME_DIR = path.join(platformFolders.getDocumentsFolder(), 'Ring Video Saver');

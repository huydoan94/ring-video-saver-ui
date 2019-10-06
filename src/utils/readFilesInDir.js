import { electron } from './electron';

export default (parentDir, withExt = false) => new Promise((resolve) => {
  electron.ipcRenderer.on('readFilesInDirResponse', (_, result) => {
    resolve(result);
  });
  electron.ipcRenderer.send('readFilesInDirRequest', parentDir, withExt);
});

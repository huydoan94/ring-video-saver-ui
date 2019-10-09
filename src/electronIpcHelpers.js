import electron from 'electron';
import fs from 'fs';
import path from 'path';
import forEach from 'lodash/forEach';

export default () => {
  electron.ipcMain.on('readFilesInDirRequest', (event, parentDir, withExt = false) => {
    const downloadedFiles = [];
    const saveFilePathsInDir = (dirPath) => {
      const content = fs.readdirSync(dirPath);
      forEach(content, (childName) => {
        const childPath = path.join(dirPath, childName);
        if (fs.lstatSync(childPath).isDirectory()) {
          saveFilePathsInDir(childPath);
          return;
        }
        const parsed = path.parse(childPath);
        downloadedFiles.push(path.join(parsed.dir, `${parsed.name}${withExt ? parsed.ext : ''}`));
      });
    };

    saveFilePathsInDir(parentDir);
    event.reply('readFilesInDirResponse', downloadedFiles);
  });
};

import electron from 'electron';
import fs from 'fs';
import path from 'path';
import { map } from 'lodash';

import promiseAllWithLimit from './utils/promiseAllWithLimit';

export default () => {
  electron.ipcMain.on('readFilesInDirRequest', (event, parentDir, withExt = false) => {
    const walk = (dir, done) => {
      let results = [];
      fs.readdir(dir, (err, list) => {
        if (err) {
          done(err);
          return;
        }

        let pending = list.length;
        if (pending <= 0) {
          done(null, results);
          return;
        }

        const runners = map(list, fileName => async () => {
          const file = path.resolve(dir, fileName);
          fs.stat(file, (_, stat) => {
            if (stat && stat.isDirectory()) {
              walk(file, (_2, res) => {
                results = results.concat(res);
                pending -= 1;
                if (pending <= 0) done(null, results);
              });
            } else {
              const parsed = path.parse(file);
              results.push(path.join(parsed.dir, `${parsed.name}${withExt ? parsed.ext : ''}`));
              pending -= 1;
              if (pending <= 0) done(null, results);
            }
          });
        });
        promiseAllWithLimit(runners, 100);
      });
    };

    walk(parentDir, (err, results) => {
      if (err) {
        event.reply('readFilesInDirResponse', []);
        return;
      }
      event.reply('readFilesInDirResponse', results);
    });
  });
};

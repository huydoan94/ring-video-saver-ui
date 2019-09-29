import { reduce } from 'lodash';

import { electronImport } from './electron';

const fs = electronImport('fs');

export default async dirs => reduce(dirs, (acc, d) => acc.then(() => new Promise((resolve, reject) => {
  fs.mkdir(d, '0777', (err) => {
    if (err) {
      if (err.code === 'EEXIST') resolve();
      else reject(err);
    } else resolve();
  });
})), Promise.resolve());

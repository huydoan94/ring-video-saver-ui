import semver from 'semver';
import { forEach, isEmpty } from 'lodash';
import JSONBigInt from 'json-bigint';

import { electronImport } from './electron';
import userstorage from './userstorage';
import { DEFAULT_HOME_DIR } from '../constants';

const fs = electronImport('fs');
const path = electronImport('path');

const migrationDefs = {
  '0.1.3': () => {
    const keys = Object.keys(localStorage);
    forEach(keys, (key) => {
      if (key === 'runningVersion') return;
      localStorage.removeItem(key);
    });
  },
  '0.1.4': () => {
    const keys = Object.keys(localStorage);
    forEach(keys, (key) => {
      if (key === 'runningVersion') return;
      localStorage.removeItem(key);
    });
  },
  '0.1.6': () => {
    const lastUser = localStorage.getItem('currentUser');
    if (isEmpty(lastUser)) return;

    const downloadLocation = userstorage.getItem('downloadLocation');
    if (isEmpty(downloadLocation)) {
      userstorage.setItem('downloadLocation', DEFAULT_HOME_DIR);
    }
  },
  '0.1.7': () => {
    const lastUser = localStorage.getItem('currentUser');
    if (isEmpty(lastUser)) return;

    let metadata = userstorage.getItem('metadata');
    if (isEmpty(metadata)) metadata = {};
    else metadata = JSONBigInt.parse(metadata);
    const downloadLocation = userstorage.getItem('downloadLocation');
    const downloadedFiles = [];
    const saveFilesInDir = (dirPath) => {
      const content = fs.readdirSync(dirPath);
      forEach(content, (childName) => {
        const childPath = path.join(dirPath, childName);
        if (fs.lstatSync(childPath).isDirectory()) {
          saveFilesInDir(childPath);
          return;
        }
        const parsed = path.parse(childPath);
        downloadedFiles.push(path.join(parsed.dir, parsed.name));
      });
    };

    saveFilesInDir(downloadLocation);
    metadata = { ...metadata, downloadedFiles };
    userstorage.setItem('metadata', JSONBigInt.stringify(metadata));
  },
  '0.1.8': () => {
    const keys = Object.keys(localStorage);
    forEach(keys, (key) => {
      if (key.indexOf('-data') === -1) return;

      const newKey = key.replace('-data', '_data');
      localStorage.setItem(newKey, localStorage.getItem(key));
      localStorage.removeItem(key);
    });
  },
};

export default (currentVersion, previousVersion) => {
  if (semver.eq(currentVersion, previousVersion)) return;
  forEach(migrationDefs, (migrationFunc, version) => {
    if (semver.gte(currentVersion, version) && semver.lt(previousVersion, version)) {
      migrationFunc();
    }
  });

  localStorage.setItem('runningVersion', currentVersion);
};

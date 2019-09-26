export const electron = window.require('electron');
export const electronImport = packageName => electron.remote.require(packageName);

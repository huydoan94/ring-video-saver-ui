import libaxios from 'axios';
import { electronImport } from './electron';

const appAxios = electronImport('axios');

const axiosWrapper = axiosExec => async (...params) => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    reject(new Error('Timeout !!!'));
  }, 60000);
  axiosExec(...params).then((res) => {
    clearTimeout(timeout);
    resolve(res);
  }).catch((err) => {
    clearTimeout(timeout);
    reject(err);
  });
});

export const electronAxios = axiosWrapper(appAxios);
export default axiosWrapper(libaxios);

import { forEach } from 'lodash';

export default class CancellablePromise {
  constructor() {
    this.rejectChain = [];
    this.errorMessage = new Error('Promise cancelled');
    this.isCancelled = false;
  }

  wrap = promiseFunc => new Promise((resolve, reject) => {
    promiseFunc.then((res) => {
      resolve(res);
    }).catch((err) => {
      reject(err);
    });
    if (this.isCancelled) {
      reject(this.errorMessage);
      return;
    }
    this.rejectChain.push(reject);
  })

  run = callback => new Promise((resolve, reject) => {
    if (this.isCancelled) {
      reject(this.errorMessage);
      return;
    }
    this.rejectChain.push(reject);
    callback(resolve, reject);
  })

  cancel = () => {
    this.isCancelled = true;
    forEach(this.rejectChain, (rejectFunc) => {
      rejectFunc(new Error('Promise Cancelled'));
    });
  }
}

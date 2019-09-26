import {
  isEmpty, every, sortBy, map,
} from 'lodash';

export default async (callers, maxPromise = 5, stopOnError = true) => {
  if (isEmpty(callers)) return [];
  return new Promise((resolve, reject) => {
    const endIndex = callers.length - 1;
    let currentIndex = -1;
    let currentInPool = 0;
    let isFailed = false;
    const results = [];
    const resolveResults = (data) => {
      if (every(data, r => r.data === null)) {
        reject(new Error('Promise failed !!!'));
      }
      const sorted = sortBy(data, r => r.index);
      const sortedResults = map(sorted, s => s.data);
      resolve(sortedResults);
    };
    const next = () => {
      if (isFailed) return;
      if (currentIndex >= endIndex && currentInPool <= 0) {
        resolveResults(results);
        return;
      }
      if (currentIndex >= endIndex) return;

      currentIndex += 1;
      currentInPool += 1;
      ((innerIndex) => {
        callers[innerIndex]().then((res) => {
          results.push({ index: innerIndex, data: res });
          currentInPool -= 1;
          next();
        }).catch((err) => {
          if (stopOnError) {
            isFailed = true;
            reject(err);
            return;
          }
          results.push({ index: innerIndex, data: null });
          currentInPool -= 1;
          next();
        });
      })(currentIndex);
    };

    for (let i = 0; i < maxPromise; i += 1) {
      next();
    }
  });
};

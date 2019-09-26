import { get } from 'lodash';
import sleep from './sleep';

export default async (fetcher, ...params) => {
  const retries = 5;
  const retryFunc = remain => fetcher(...params).catch((err) => {
    if (remain === 0 || get(err, 'response.status') === 401) {
      throw err;
    }
    return sleep(3000).then(() => retryFunc(remain - 1));
  });
  return retryFunc(retries - 1);
};

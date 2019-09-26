import { isNil, map } from 'lodash';
import promiseAllWithLimit from './promiseAllWithLimit';

export default async (collection, iteratee) => {
  if (isNil(collection)) return [];
  const iteratees = map(collection, (...params) => () => iteratee(...params));
  return promiseAllWithLimit(iteratees, 20);
};

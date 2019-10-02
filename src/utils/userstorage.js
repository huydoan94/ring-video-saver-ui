import { isEmpty, get } from 'lodash';
import JSONBigInt from 'json-bigint';

export default (() => {
  const getUserDataKey = username => `${username}_data`;
  const wrapper = func => (...params) => {
    const currentUser = localStorage.getItem('currentUser');
    if (isEmpty(currentUser)) return null;

    let userData = localStorage.getItem(getUserDataKey(currentUser));
    if (isEmpty(userData)) userData = {};
    else userData = JSONBigInt.parse(userData);
    return func(currentUser, userData, ...params);
  };

  return {
    getItem: wrapper((_, userData, key) => get(userData, key)),
    setItem: wrapper((currentUser, userData, key, value) => {
      const updated = { ...userData, [key]: value };
      localStorage.setItem(getUserDataKey(currentUser), JSONBigInt.stringify(updated));
    }),
  };
})();

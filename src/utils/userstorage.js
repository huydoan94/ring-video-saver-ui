import { isEmpty, get } from 'lodash';
import JSONBigInt from 'json-bigint';

export default (() => {
  const getCurrentUser = () => localStorage.getItem('currentUser');

  return {
    getItem: k => (isEmpty(getCurrentUser())
      ? null
      : get(JSONBigInt.parse(localStorage.getItem(`${getCurrentUser()}-data`)), k)),
    setItem: (k, v) => {
      if (isEmpty(getCurrentUser())) return;
      let userData = localStorage.getItem(`${getCurrentUser()}-data`);
      userData = isEmpty(userData) ? {} : JSONBigInt.parse(userData);
      userData = { ...userData, [k]: v };
      localStorage.setItem(`${getCurrentUser()}-data`, JSONBigInt.stringify(userData));
    },
  };
})();

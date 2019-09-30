import { isEmpty, get } from 'lodash';

export default (() => {
  const getCurrentUser = () => localStorage.getItem('currentUser');

  return {
    getItem: k => (isEmpty(getCurrentUser())
      ? null
      : get(JSON.parse(localStorage.getItem(`${getCurrentUser()}-data`)), k)),
    setItem: (k, v) => {
      if (isEmpty(getCurrentUser())) return;
      let userData = localStorage.getItem(`${getCurrentUser()}-data`);
      userData = isEmpty(userData) ? {} : JSON.parse(userData);
      userData = { ...userData, [k]: v };
      localStorage.setItem(`${getCurrentUser()}-data`, JSON.stringify(userData));
    },
  };
})();

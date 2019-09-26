import { isEmpty } from 'lodash';

export default () => {
  const authData = JSON.parse(localStorage.getItem('authData'));
  if (authData === null) return false;
  return !isEmpty(authData.accessToken);
};

import { get } from 'lodash';

import { electronImport } from '../utils/electron';
import promiseFetchWithRetry from '../utils/promiseFetchWithRetry';

const axios = electronImport('axios');

export const login = (username, password) => {
  const reqBody = {
    username,
    password,
    grant_type: 'password',
    scope: 'client',
    client_id: 'ring_official_android',
  };

  return promiseFetchWithRetry(axios, {
    url: 'https://oauth.ring.com/oauth/token',
    method: 'POST',
    data: reqBody,
  }).then(res => get(res, 'data')).catch((err) => {
    throw err;
  });
};

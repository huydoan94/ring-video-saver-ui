import { get, isEmpty } from 'lodash';
import axios from 'axios';

import { API_VERSION } from '../constants';
import getHardwareId from '../utils/getHardwareId';
import userstorage from '../utils/userstorage';

const saveAuthData = (data) => {
  if (!data) localStorage.setItem('authData', null);

  localStorage.setItem('authData', JSON.stringify({
    accessToken: get(data, 'access_token'),
    refreshToken: get(data, 'refresh_token'),
    expiresIn: get(data, 'expires_in'),
    scope: get(data, 'scope'),
    tokenType: get(data, 'token_type'),
  }));
};

export const login = (username, password, twoFactorAuthCode) => {
  const reqBody = {
    username,
    password,
    grant_type: 'password',
    scope: 'client',
    client_id: 'ring_official_android',
  };

  return axios({
    url: 'https://oauth.ring.com/oauth/token',
    method: 'POST',
    data: reqBody,
    headers: {
      '2fa-support': 'true',
      '2fa-code': isEmpty(twoFactorAuthCode) ? '' : twoFactorAuthCode,
      hardware_id: getHardwareId(),
    },
  }).then((res) => {
    const data = get(res, 'data');
    saveAuthData(data, username);
    localStorage.setItem('currentUser', username);
    return data;
  }).catch((err) => {
    saveAuthData();
    localStorage.setItem('currentUser', null);
    throw err;
  });
};

export const loginUseToken = (refreshToken) => {
  const reqBody = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: 'client',
    client_id: 'ring_official_android',
  };

  return axios({
    url: 'https://oauth.ring.com/oauth/token',
    method: 'POST',
    data: reqBody,
    headers: {
      hardware_id: getHardwareId(),
    },
  }).then((res) => {
    const data = get(res, 'data');
    saveAuthData(data);
    return data;
  }).catch((err) => {
    saveAuthData();
    throw err;
  });
};

export const createSession = (accessToken) => {
  const reqBody = {
    device: {
      hardware_id: getHardwareId(),
      metadata: {
        api_version: API_VERSION,
      },
      os: 'android',
    },
  };

  return axios({
    url: 'https://api.ring.com/clients_api/session',
    method: 'POST',
    data: reqBody,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }).then((res) => {
    const sessionToken = get(res, 'data.profile.authentication_token');
    userstorage.setItem('sessionToken', sessionToken);
    return sessionToken;
  }).catch((err) => {
    userstorage.setItem('sessionToken', null);
    throw err;
  });
};

export const logout = () => {
  userstorage.setItem('sessionToken', null);
  localStorage.setItem('authData', null);
  localStorage.setItem('isRemember', false);
};

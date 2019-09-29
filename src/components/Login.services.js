import { get } from 'lodash';
import axios from 'axios';

import { API_VERSION } from '../constants';
import getHardwareId from '../utils/getHardwareId';

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

export const login = (username, password) => {
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
  }).then((res) => {
    const data = get(res, 'data');
    saveAuthData(data);
    return data;
  }).catch((err) => {
    saveAuthData();
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
    url: `https://api.ring.com/clients_api/session?api_version=${API_VERSION}`,
    method: 'POST',
    data: reqBody,
    headers: {
      'content-type': 'application/json',
      'content-length': JSON.stringify(reqBody).length,
      Authorization: `Bearer ${accessToken}`,
    },
  }).then((res) => {
    const sessionToken = get(res, 'data.profile.authentication_token');
    localStorage.setItem('sessionToken', sessionToken);
    return sessionToken;
  }).catch((err) => {
    localStorage.setItem('sessionToken', null);
    throw err;
  });
};

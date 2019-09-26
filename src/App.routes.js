import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { map } from 'lodash';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import isAuthenticated from './utils/isAuthenticated';

const paths = {
  root: '/',
  login: '/login',
  dashboard: '/dashboard',
};

const authComponent = (Component, props) => {
  if (!isAuthenticated()) {
    return <Redirect to={paths.login} />;
  }
  return <Component {...props} paths={paths} />;
};

const routes = [
  {
    path: paths.root,
    component: () => <Redirect to="/login" />,
    exact: true,
  },
  {
    path: paths.login,
    component: props => <Login {...props} paths={paths} />,
    exact: true,
  },
  {
    path: paths.dashboard,
    component: props => authComponent(Dashboard, props),
    exact: true,
  },
];

export default function Routes() {
  return (
    <Switch>
      {map(routes, route => (
        <Route
          key={route.path}
          paths={paths}
          {...route}
        />
      ))}
    </Switch>
  );
}

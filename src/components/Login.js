import React, { useEffect } from 'react';
import {
  shape, func, string, bool,
} from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { isEmpty } from 'lodash';
import cx from 'classnames';
import {
  Form, Icon, Input,
  Button, Checkbox,
  Typography,
} from 'antd';

import { actions } from './Login.actions';
import {
  getErrorMessage, getLogInState, getAccessToken, getRefreshToken,
} from './Login.selectors';
import isAuthenticated from '../utils/isAuthenticated';

import styles from './Login.module.scss';

function LoginForm({
  form, login, errorMessage, isLoggingIn,
  accessToken, refreshToken, history, paths,
}) {
  const { getFieldDecorator, validateFields } = form;

  useEffect(() => {
    if (isAuthenticated()) {
      history.push(paths.dashboard);
    }
  });

  useEffect(() => {
    if (isEmpty(errorMessage) && !isEmpty(accessToken)) {
      localStorage.setItem('authData', JSON.stringify({
        accessToken,
        refreshToken,
      }));
      history.push(paths.dashboard);
    }
  }, [accessToken]);

  const handleSubmit = (e) => {
    e.preventDefault();
    validateFields((err, { username, password, isRemember }) => {
      if (!err) {
        login(username, password, isRemember);
      }
    });
  };

  return (
    <div className={styles.container}>
      <Form onSubmit={handleSubmit} className={cx(styles.form, 'login-form')}>
        <Form.Item>
          <Typography.Title className={styles.inputTitle} level={2}>Login</Typography.Title>
        </Form.Item>
        <Form.Item>
          <Typography.Paragraph className={styles.inputTitle}>Email</Typography.Paragraph>
          {getFieldDecorator('username', {
            rules: [{ required: true, message: 'Please input your username!' }],
          })(
            <Input
              prefix={<Icon type="user" className={styles.inputIcon} />}
              placeholder="Username"
            />,
          )}
        </Form.Item>
        <Form.Item>
          <Typography.Paragraph className={styles.inputTitle}>Password</Typography.Paragraph>
          {getFieldDecorator('password', {
            rules: [{ required: true, message: 'Please input your password!' }],
          })(
            <Input
              prefix={<Icon type="lock" className={styles.inputIcon} />}
              type="password"
              placeholder="Password"
            />,
          )}
        </Form.Item>
        <Form.Item className={styles.inputNoMargin}>
          {getFieldDecorator('isRemember', {
            valuePropName: 'checked',
            initialValue: true,
          })(<Checkbox>Remember me</Checkbox>)}
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          className={cx(styles.inputButton, 'login-form-button')}
          disabled={isLoggingIn}
          loading={isLoggingIn}
        >
          Log in
        </Button>
        {!isEmpty(errorMessage)
          && <Typography.Paragraph type="danger" className={styles.formError}>{errorMessage}</Typography.Paragraph>
        }
      </Form>
    </div>
  );
}

LoginForm.propTypes = {
  form: shape({
    getFieldDecorator: func.isRequired,
    validateFields: func.isRequired,
  }).isRequired,
  history: shape({
    push: func.isRequired,
  }).isRequired,
  paths: shape({
    dashboard: string.isRequired,
  }).isRequired,
  login: func.isRequired,
  errorMessage: string,
  isLoggingIn: bool.isRequired,
  accessToken: string,
  refreshToken: string,
};

LoginForm.defaultProps = {
  errorMessage: null,
  accessToken: null,
  refreshToken: null,
};

const mapStatesToProps = createStructuredSelector({
  errorMessage: getErrorMessage,
  isLoggingIn: getLogInState,
  accessToken: getAccessToken,
  refreshToken: getRefreshToken,
});

const mapDispatchToProps = dispatch => ({
  login: (...params) => dispatch(actions.login.start(...params)),
});

export default compose(
  Form.create({ name: 'login_form' }),
  connect(mapStatesToProps, mapDispatchToProps),
)(LoginForm);

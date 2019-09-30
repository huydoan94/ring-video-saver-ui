import React, { useState } from 'react';
import { shape, func, string } from 'prop-types';
import {
  Layout, Typography, Icon, Button,
} from 'antd';

import SideMenu, { menus } from './dashboard/SideMenu';
import JobManagement from './dashboard/JobManagement';
import { logout } from './Login.services';
import styles from './Dashboard.module.scss';

const menuComponents = {
  [menus.jobManagement]: JobManagement,
};

function Dashboard({ history, paths }) {
  const [currentPage, setCurrentPage] = useState(menus.jobManagement);
  const MenuComponent = menuComponents[currentPage];

  const onMenuClick = ({ key }) => {
    setCurrentPage(key);
  };

  const onClickLogout = () => {
    logout();
    history.push(paths.login);
  };

  return (
    <Layout>
      <Layout.Sider theme="light" width="256" className={styles.sider}>
        <div className={styles.title}>
          <Typography.Title level={4}>
            <Icon type="video-camera" />
            Ring Video Saver
          </Typography.Title>
        </div>
        <SideMenu
          currentMenu={currentPage}
          onMenuClick={onMenuClick}
        />
        <Button
          type="danger"
          className={styles.logoutBtn}
          onClick={onClickLogout}
        >
          Log Out
        </Button>
      </Layout.Sider>
      <Layout.Content>
        <MenuComponent />
      </Layout.Content>
    </Layout>
  );
}

Dashboard.propTypes = {
  history: shape({
    push: func.isRequired,
  }).isRequired,
  paths: shape({
    login: string.isRequired,
  }).isRequired,
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { shape, func, string } from 'prop-types';
import {
  Layout, Typography, Icon, Button,
} from 'antd';
import { debounce } from 'lodash';
import cx from 'classnames';

import SideMenu, { menus } from './dashboard/SideMenu';
import JobManagement from './dashboard/JobManagement';
import BrowseVideo from './dashboard/BrowseVideo';
import { logout } from './Login.services';
import styles from './Dashboard.module.scss';

const menuComponents = {
  [menus.jobManagement]: JobManagement,
  [menus.browseVideo]: BrowseVideo,
};

function Dashboard({ history, paths }) {
  const [currentPage, setCurrentPage] = useState(menus.jobManagement);
  const [isCollapseMenu, setIsCollapseMenu] = useState(true);
  const MenuComponent = menuComponents[currentPage];

  const onScreenResize = debounce(() => {
    if (window.innerWidth <= 768) {
      setIsCollapseMenu(true);
    } else {
      setIsCollapseMenu(false);
    }
  }, 200);

  useEffect(() => {
    window.addEventListener('resize', onScreenResize);
    return () => window.removeEventListener('resize', onScreenResize);
  }, []);

  const onMenuClick = ({ key }) => {
    setCurrentPage(key);
  };

  const onClickLogout = () => {
    logout();
    history.push(paths.login);
  };

  return (
    <Layout>
      <Layout.Sider theme="light" width="256" className={styles.sider} collapsed={isCollapseMenu}>
        <div className={cx({ [styles.titleCollapsed]: isCollapseMenu }, styles.title)}>
          <Typography.Title level={4}>
            <Icon type="video-camera" />
            {isCollapseMenu ? '' : 'Ring Video Saver'}
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
          {isCollapseMenu ? <Icon type="logout" /> : 'Log Out'}
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

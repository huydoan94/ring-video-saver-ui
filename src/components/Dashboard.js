import React, { useState } from 'react';
import { Layout, Typography, Icon } from 'antd';

import SideMenu, { menus } from './dashboard/SideMenu';
import JobManagement from './dashboard/JobManagement';
import styles from './Dashboard.module.scss';

const menuComponents = {
  [menus.jobManagement]: JobManagement,
};

function Dashboard() {
  const [currentPage, setCurrentPage] = useState(menus.jobManagement);
  const MenuComponent = menuComponents[currentPage];

  const onMenuClick = ({ key }) => {
    setCurrentPage(key);
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
      </Layout.Sider>
      <Layout.Content>
        <MenuComponent />
      </Layout.Content>
    </Layout>

  );
}

export default Dashboard;

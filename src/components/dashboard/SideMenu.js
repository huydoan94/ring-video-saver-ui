import React from 'react';
import { func, string } from 'prop-types';
import { Menu, Icon } from 'antd';

import styles from './SideMenu.module.scss';

export const menus = {
  jobManagement: 'job-management',
};

export default function SideMenu({ currentMenu, onMenuClick }) {
  return (
    <Menu
      onClick={onMenuClick}
      selectedKeys={[currentMenu]}
      mode="inline"
      className={styles.menuContainer}
    >
      <Menu.Item key={menus.jobManagement}>
        <Icon type="pie-chart" />
        <span>Job Management</span>
      </Menu.Item>
    </Menu>
  );
}

SideMenu.propTypes = {
  onMenuClick: func.isRequired,
  currentMenu: string,
};

SideMenu.defaultProps = {
  currentMenu: menus.jobManagement,
};

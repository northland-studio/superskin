import { Layout, Menu } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  EditOutlined,
  PictureOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useUserStore } from '../stores/userStore';
import styles from './MainLayout.module.css';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: '首页' },
  { key: '/editor', icon: <EditOutlined />, label: '皮肤编辑器' },
  { key: '/gallery', icon: <PictureOutlined />, label: '皮肤库' },
];

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isLoggedIn } = useUserStore();

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout className={styles.layout}>
      <Sider width={220} className={styles.sider}>
        <div className={styles.logo}>
          <span className={styles.logoText}>SuperSkin</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className={styles.menu}
        />
      </Sider>
      <Layout>
        <Header className={styles.header}>
          <div className={styles.headerRight}>
            {isLoggedIn && user ? (
              <div className={styles.userInfo}>
                <UserOutlined />
                <span>{user.username}</span>
                <LogoutOutlined className={styles.logoutIcon} onClick={handleLogout} />
              </div>
            ) : (
              <div className={styles.authButtons}>
                <span onClick={() => navigate('/login')}>登录</span>
                <span onClick={() => navigate('/register')}>注册</span>
              </div>
            )}
          </div>
        </Header>
        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default MainLayout;

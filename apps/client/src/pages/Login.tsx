import { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';
import { apiService } from '@/services/api';
import { logger } from '@/utils/logger';
import styles from './Auth.module.css';

const { Title } = Typography;

interface LoginForm {
  username: string;
  password: string;
}

function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useUserStore();

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      const user = await apiService.login(values.username, values.password);
      
      logger.info('Login API returned user', { 
        id: user.id, 
        username: user.username, 
        hasToken: !!user.token,
        tokenLength: user.token?.length || 0
      });
      
      const tokenToSave = user.token || '';
      logger.info('Calling login with token', { tokenEmpty: tokenToSave === '' });
      
      login(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
        },
        tokenToSave
      );

      message.success('登录成功！');
      navigate('/');
    } catch (error: unknown) {
      console.error('Login error:', error);
      const err = error as { 
        response?: { 
          data?: { 
            message?: string;
            statusCode?: number;
          };
          status?: number;
        };
        message?: string;
        code?: string;
      };
      
      let errorMessage = '登录失败，请检查用户名和密码';
      
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        errorMessage = '网络连接失败，请检查网络或服务器状态';
      } else if (err.response?.status === 401 || err.response?.data?.statusCode === 401) {
        errorMessage = '用户名或密码错误';
      } else if (err.response?.status === 400 || err.response?.data?.statusCode === 400) {
        errorMessage = err.response?.data?.message || '请求参数错误';
      } else if (err.response?.status === 500) {
        errorMessage = '服务器内部错误，请稍后重试';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <Title level={2} className={styles.title}>
          登录 SuperSkin
        </Title>
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>

          <div className={styles.footer}>
            还没有账号？
            <Button type="link" onClick={() => navigate('/register')}>
              立即注册
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}

export default Login;

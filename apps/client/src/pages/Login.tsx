import { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';
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
      await new Promise((resolve) => setTimeout(resolve, 1000));

      login(
        {
          id: '1',
          username: values.username,
          email: `${values.username}@example.com`,
        },
        'mock-token'
      );

      message.success('登录成功！');
      navigate('/');
    } catch {
      message.error('登录失败，请检查用户名和密码');
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

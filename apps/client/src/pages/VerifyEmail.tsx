import { useState, useEffect, useRef } from 'react';
import { Button, Card, Typography, message, Space } from 'antd';
import { MailOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiService } from '@/services/api';
import styles from './VerifyEmail.module.css';

const { Title, Paragraph } = Typography;

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const email = searchParams.get('email') || '';

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleInputChange = (index: number, value: string) => {
    let newValue = value;
    if (newValue.length > 1) {
      newValue = newValue.slice(-1);
    }

    if (!/^\d*$/.test(newValue)) return;

    const newCode = [...code];
    newCode[index] = newValue;
    setCode(newCode);

    if (newValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newCode = [...code];
      for (let i = 0; i < pastedData.length; i++) {
        newCode[i] = pastedData[i];
      }
      setCode(newCode);
      if (pastedData.length === 6) {
        handleVerify(pastedData);
      }
    }
  };

  const handleVerify = async (verificationCode: string) => {
    if (!email) {
      message.error('邮箱地址缺失');
      return;
    }

    setLoading(true);
    try {
      await apiService.verifyEmail(email, verificationCode);
      message.success('邮箱验证成功！');
      navigate('/login');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '验证失败，请检查验证码');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      message.error('邮箱地址缺失');
      return;
    }

    setResending(true);
    try {
      await apiService.resendVerificationCode(email);
      message.success('验证码已重新发送');
      setCountdown(60);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '发送失败');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.iconWrapper}>
          <MailOutlined className={styles.icon} />
        </div>
        
        <Title level={2} className={styles.title}>
          验证您的邮箱
        </Title>
        
        <Paragraph className={styles.description}>
          我们已向 <strong>{email || '您的邮箱'}</strong> 发送了6位数字验证码
        </Paragraph>

        <div className={styles.codeInput}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className={styles.input}
              disabled={loading}
            />
          ))}
        </div>

        <Button
          type="primary"
          size="large"
          block
          loading={loading}
          onClick={() => handleVerify(code.join(''))}
          className={styles.verifyButton}
          disabled={code.some(d => d === '')}
        >
          验证
        </Button>

        <div className={styles.resendWrapper}>
          {countdown > 0 ? (
            <span className={styles.countdown}>{countdown}秒后可重新发送</span>
          ) : (
            <Button
              type="link"
              icon={<ReloadOutlined />}
              onClick={handleResend}
              loading={resending}
            >
              重新发送验证码
            </Button>
          )}
        </div>

        <div className={styles.footer}>
          <Space>
            <Button type="link" onClick={() => navigate('/login')}>
              返回登录
            </Button>
            <Button type="link" onClick={() => navigate('/register')}>
              更换邮箱注册
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
}

export default VerifyEmail;

import { Button, Card, Typography, Row, Col } from 'antd';
import { EditOutlined, CloudUploadOutlined, PictureOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from './Home.module.css';

const { Title, Paragraph } = Typography;

function Home() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <Title level={1} className={styles.title}>
          欢迎使用 SuperSkin
        </Title>
        <Paragraph className={styles.subtitle}>
          一键将图片转换为 Minecraft 皮肤，支持在线编辑与3D预览
        </Paragraph>
        <Button
          type="primary"
          size="large"
          icon={<EditOutlined />}
          onClick={() => navigate('/editor')}
        >
          开始创作
        </Button>
      </div>

      <Row gutter={[24, 24]} className={styles.features}>
        <Col xs={24} md={8}>
          <Card hoverable className={styles.featureCard}>
            <CloudUploadOutlined className={styles.icon} />
            <Title level={4}>图片转皮肤</Title>
            <Paragraph>上传任意图片，自动转换为标准 Minecraft 皮肤格式</Paragraph>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card hoverable className={styles.featureCard}>
            <EditOutlined className={styles.icon} />
            <Title level={4}>像素编辑器</Title>
            <Paragraph>内置专业像素编辑工具，精细调整每一个像素</Paragraph>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card hoverable className={styles.featureCard}>
            <PictureOutlined className={styles.icon} />
            <Title level={4}>3D预览</Title>
            <Paragraph>实时3D预览皮肤效果，支持旋转和动画展示</Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Home;

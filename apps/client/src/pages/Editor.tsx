import { useRef, useState } from 'react';
import { Button, Upload, Card, Row, Col, Slider, Space, message } from 'antd';
import { UploadOutlined, DownloadOutlined, UndoOutlined, RedoOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import styles from './Editor.module.css';

function Editor() {
  const [image, setImage] = useState<string | null>(null);
  const [skinPreview, setSkinPreview] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleUpload = (file: UploadFile) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      convertToSkin(e.target?.result as string);
    };
    reader.readAsDataURL(file as unknown as File);
    return false;
  };

  const convertToSkin = (imageSrc: string) => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 64;
      canvas.height = 64;

      ctx.clearRect(0, 0, 64, 64);

      const scale = Math.min(64 / img.width, 64 / img.height);
      const width = img.width * scale;
      const height = img.height * scale;
      const x = (64 - width) / 2;
      const y = (64 - height) / 2;

      ctx.drawImage(img, x, y, width, height);

      setSkinPreview(canvas.toDataURL('image/png'));
      message.success('皮肤转换成功！');
    };
    img.src = imageSrc;
  };

  const handleDownload = () => {
    if (!skinPreview) return;

    const link = document.createElement('a');
    link.download = 'superskin_skin.png';
    link.href = skinPreview;
    link.click();
    message.success('皮肤已下载！');
  };

  return (
    <div className={styles.container}>
      <Row gutter={24}>
        <Col span={12}>
          <Card title="上传图片" className={styles.card}>
            <Upload.Dragger
              accept="image/*"
              beforeUpload={handleUpload}
              showUploadList={false}
              className={styles.uploader}
            >
              {image ? (
                <img src={image} alt="preview" className={styles.previewImage} />
              ) : (
                <div className={styles.uploadPlaceholder}>
                  <UploadOutlined className={styles.uploadIcon} />
                  <p>点击或拖拽图片到此区域</p>
                  <p className={styles.hint}>支持 JPG、PNG 格式</p>
                </div>
              )}
            </Upload.Dragger>
          </Card>
        </Col>

        <Col span={12}>
          <Card
            title="皮肤预览"
            className={styles.card}
            extra={
              <Space>
                <Button icon={<UndoOutlined />}>撤销</Button>
                <Button icon={<RedoOutlined />}>重做</Button>
                <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
                  导出皮肤
                </Button>
              </Space>
            }
          >
            <div className={styles.skinPreview}>
              <canvas ref={canvasRef} className={styles.canvas} />
              {skinPreview && (
                <img src={skinPreview} alt="skin" className={styles.skinImage} />
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="编辑工具" className={styles.toolsCard}>
        <Row gutter={16}>
          <Col span={8}>
            <div className={styles.toolItem}>
              <span>亮度</span>
              <Slider defaultValue={100} max={200} />
            </div>
          </Col>
          <Col span={8}>
            <div className={styles.toolItem}>
              <span>对比度</span>
              <Slider defaultValue={100} max={200} />
            </div>
          </Col>
          <Col span={8}>
            <div className={styles.toolItem}>
              <span>饱和度</span>
              <Slider defaultValue={100} max={200} />
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}

export default Editor;

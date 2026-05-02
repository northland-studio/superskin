import { Card, Row, Col, Empty, Button, Popconfirm, Space, Tag } from 'antd';
import { DeleteOutlined, DownloadOutlined, EditOutlined } from '@ant-design/icons';
import { useSkinStore } from '../stores/skinStore';
import styles from './Gallery.module.css';

function Gallery() {
  const { skins } = useSkinStore();

  const handleDownload = (skinId: string) => {
    console.log('Download skin:', skinId);
  };

  const handleEdit = (skinId: string) => {
    console.log('Edit skin:', skinId);
  };

  const handleDelete = (skinId: string) => {
    console.log('Delete skin:', skinId);
  };

  if (skins.length === 0) {
    return (
      <div className={styles.empty}>
        <Empty description="暂无皮肤，快去创作吧！" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Row gutter={[16, 16]}>
        {skins.map((skin) => (
          <Col xs={24} sm={12} md={8} lg={6} key={skin.id}>
            <Card
              hoverable
              cover={
                <div className={styles.preview}>
                  <img alt={skin.name} src={skin.previewPath} />
                </div>
              }
              actions={[
                <EditOutlined key="edit" onClick={() => handleEdit(skin.id)} />,
                <DownloadOutlined key="download" onClick={() => handleDownload(skin.id)} />,
                <Popconfirm
                  title="确定删除此皮肤？"
                  onConfirm={() => handleDelete(skin.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <DeleteOutlined key="delete" />
                </Popconfirm>,
              ]}
            >
              <Card.Meta
                title={skin.name}
                description={
                  <Space direction="vertical" size={4}>
                    <span className={styles.description}>{skin.description || '暂无描述'}</span>
                    <div>
                      {skin.isPublic ? (
                        <Tag color="blue">公开</Tag>
                      ) : (
                        <Tag color="default">私有</Tag>
                      )}
                    </div>
                  </Space>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}

export default Gallery;

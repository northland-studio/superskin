import { useEffect, useState } from 'react';
import { Card, Row, Col, Empty, Popconfirm, Space, Tag, Button, message, Spin } from 'antd';
import { DeleteOutlined, DownloadOutlined, EditOutlined, CloudSyncOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSkinStore } from '../stores/skinStore';
import { useUserStore } from '../stores/userStore';
import { apiService } from '../services/api';
import styles from './Gallery.module.css';

function Gallery() {
  const { skins, loadSkins, deleteSkin, isLoading } = useSkinStore();
  const { user, token } = useUserStore();
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadSkins();
  }, [loadSkins]);

  const handleDownload = (skin: { id: string; name: string; skinData: string }) => {
    const link = document.createElement('a');
    link.download = `${skin.name}.png`;
    link.href = skin.skinData;
    link.click();
    message.success('皮肤已下载！');
  };

  const handleEdit = (skinId: string) => {
    navigate(`/editor?skin=${skinId}`);
  };

  const handleDelete = async (skinId: string) => {
    const success = await deleteSkin(skinId);
    if (success) {
      message.success('皮肤已删除');
    } else {
      message.error('删除失败');
    }
  };

  const handleSyncToServer = async () => {
    if (!user || !token) {
      message.warning('请先登录以同步到云端');
      return;
    }

    setSyncing(true);
    try {
      let successCount = 0;
      for (const skin of skins) {
        try {
          const blob = await (await fetch(skin.skinData)).blob();
          const file = new File([blob], `${skin.name}.png`, { type: 'image/png' });
          const uploadResult = await apiService.uploadSkin(file);
          
          await apiService.createSkin({
            name: skin.name,
            description: skin.description,
            filePath: uploadResult.path,
            previewPath: skin.previewData,
            isPublic: skin.isPublic,
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to sync skin ${skin.name}:`, err);
        }
      }
      message.success(`已同步 ${successCount}/${skins.length} 个皮肤到云端`);
    } catch (error) {
      message.error('同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncFromServer = async () => {
    if (!user || !token) {
      message.warning('请先登录以从云端同步');
      return;
    }

    setSyncing(true);
    try {
      const result = await apiService.getSkins();
      const serverSkins = result.data;
      
      if (Array.isArray(serverSkins)) {
        message.success(`从云端获取了 ${serverSkins.length} 个皮肤`);
      }
    } catch (error) {
      message.error('从云端同步失败');
    } finally {
      setSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.empty}>
        <Spin size="large" />
      </div>
    );
  }

  if (skins.length === 0) {
    return (
      <div className={styles.empty}>
        <Empty description="暂无皮肤，快去创作吧！" />
        <Button type="primary" onClick={() => navigate('/editor')} style={{ marginTop: 16 }}>
          开始创作
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>我的皮肤库 ({skins.length})</h2>
        <Space>
          {user && token && (
            <>
              <Button 
                icon={<CloudUploadOutlined />} 
                onClick={handleSyncToServer}
                loading={syncing}
              >
                同步到云端
              </Button>
              <Button 
                icon={<CloudSyncOutlined />} 
                onClick={handleSyncFromServer}
                loading={syncing}
              >
                从云端同步
              </Button>
            </>
          )}
        </Space>
      </div>
      <Row gutter={[16, 16]}>
        {skins.map((skin) => (
          <Col xs={24} sm={12} md={8} lg={6} key={skin.id}>
            <Card
              hoverable
              cover={
                <div className={styles.preview}>
                  {skin.previewData ? (
                    <img alt={skin.name} src={skin.previewData} />
                  ) : (
                    <img alt={skin.name} src={skin.skinData} style={{ imageRendering: 'pixelated' }} />
                  )}
                </div>
              }
              actions={[
                <EditOutlined key="edit" onClick={() => handleEdit(skin.id)} />,
                <DownloadOutlined key="download" onClick={() => handleDownload(skin)} />,
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

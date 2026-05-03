import { useEffect, useState } from 'react';
import { Card, Row, Col, Empty, Popconfirm, Space, Tag, Button, message, Spin } from 'antd';
import { DeleteOutlined, DownloadOutlined, EditOutlined, CloudSyncOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSkinStore } from '../stores/skinStore';
import { useUserStore } from '../stores/userStore';
import { apiService } from '../services/api';
import { logger } from '@/utils/logger';
import styles from './Gallery.module.css';

function Gallery() {
  const { skins, loadSkins, deleteSkin, addSkin, isLoading } = useSkinStore();
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
    logger.info('Starting sync to server', { skinCount: skins.length });
    
    try {
      let successCount = 0;
      for (const skin of skins) {
        try {
          const response = await fetch(skin.skinData);
          const blob = await response.blob();
          const file = new File([blob], `${skin.name}.png`, { type: 'image/png' });
          
          const uploadResult = await apiService.uploadSkin(file);
          
          await apiService.createSkin({
            name: skin.name,
            description: skin.description,
            filePath: uploadResult.filePath,
            previewPath: skin.previewData,
            isPublic: skin.isPublic,
          });
          
          successCount++;
          logger.info('Skin synced successfully', { name: skin.name });
        } catch (err) {
          logger.error('Failed to sync skin', { name: skin.name, error: String(err) });
        }
      }
      message.success(`已同步 ${successCount}/${skins.length} 个皮肤到云端`);
    } catch (error) {
      logger.error('Sync to server failed', error);
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
    logger.info('Starting sync from server');
    
    try {
      const result = await apiService.getSkins();
      const serverSkins = result.data;
      
      logger.info('Server skins fetched', { count: serverSkins?.length || 0 });
      
      if (Array.isArray(serverSkins) && serverSkins.length > 0) {
        let downloadedCount = 0;
        
        for (const serverSkin of serverSkins) {
          try {
            if (skins.find(s => s.skinData === apiService.getSkinUrl(serverSkin.filePath))) {
              logger.info('Skin already exists locally, skipping', { name: serverSkin.name });
              continue;
            }
            
            logger.info('Downloading skin from server', { name: serverSkin.name, filePath: serverSkin.filePath });
            
            const skinDataUrl = await apiService.downloadSkinImage(serverSkin.filePath);
            
            const localSkin = await useSkinStore.getState().saveSkin(
              serverSkin.name,
              skinDataUrl,
              skinDataUrl,
              serverSkin.description
            );
            
            if (localSkin) {
              downloadedCount++;
              logger.info('Skin downloaded and saved locally', { name: serverSkin.name });
            }
          } catch (err) {
            logger.error('Failed to download skin', { name: serverSkin.name, error: String(err) });
          }
        }
        
        message.success(`从云端下载了 ${downloadedCount} 个皮肤`);
      } else {
        message.info('云端暂无皮肤');
      }
    } catch (error) {
      logger.error('Sync from server failed', error);
      message.error('从云端同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const handleCardClick = (skinId: string) => {
    navigate(`/editor?skin=${skinId}`);
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
        <Space direction="vertical" size={16}>
          <Button type="primary" onClick={() => navigate('/editor')}>
            开始创作
          </Button>
          {user && token && (
            <Button icon={<CloudSyncOutlined />} onClick={handleSyncFromServer} loading={syncing}>
              从云端同步
            </Button>
          )}
        </Space>
      </div>
    );
  }

  const showCloudButtons = user && token;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>我的皮肤库 ({skins.length})</h2>
        <Space>
          {showCloudButtons && (
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
                <div className={styles.preview} onClick={() => handleCardClick(skin.id)}>
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

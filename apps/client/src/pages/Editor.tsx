import { useState, useCallback, useEffect } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  Upload,
  Card,
  Row,
  Col,
  Slider,
  Space,
  message,
  Tabs,
  Switch,
  Input,
  Modal,
  Select,
  Radio,
  Typography,
  Progress,
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  SaveOutlined,
  EyeOutlined,
  EditOutlined,
  SettingOutlined,
  FileImageOutlined,
  SkinOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { PixelEditor, SkinPreview3D } from '@/components';
import { skinConverter, ConversionOptions, ConversionResult } from '@/utils';
import { useSkinStore } from '@/stores/skinStore';
import { useUserStore } from '@/stores/userStore';
import { apiService } from '@/services/api';
import { logger } from '@/utils/logger';
import styles from './Editor.module.css';

const { Text } = Typography;

type SaveTarget = 'local' | 'server' | 'both';
type ImportMode = 'image' | 'skin';

interface ConversionProgress {
  stage: string;
  progress: number;
}

function Editor() {
  const [searchParams] = useSearchParams();
  const [image, setImage] = useState<string | null>(null);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [skinName, setSkinName] = useState('我的皮肤');
  const [skinDescription, setSkinDescription] = useState('');
  const [activeTab, setActiveTab] = useState('convert');
  const [isSaving, setIsSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [saveTarget, setSaveTarget] = useState<SaveTarget>('local');
  const [importMode, setImportMode] = useState<ImportMode>('image');
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<ConversionProgress | null>(null);
  const [editingSkinId, setEditingSkinId] = useState<string | null>(null);
  
  const { saveSkin, skins, loadSkins, updateSkin } = useSkinStore();
  const { user, token } = useUserStore();
  
  const [options, setOptions] = useState<Partial<ConversionOptions>>({
    removeBackground: true,
    backgroundTolerance: 50,
    brightness: 1.0,
    contrast: 1.0,
    saturation: 1.0,
    useAI: true,
    useSegmentation: true,
  });

  useEffect(() => {
    loadSkins();
  }, [loadSkins]);

  useEffect(() => {
    const skinId = searchParams.get('skin');
    if (skinId && skins.length > 0) {
      const skinToEdit = skins.find(s => s.id === skinId);
      if (skinToEdit) {
        setEditingSkinId(skinId);
        setSkinName(skinToEdit.name);
        setSkinDescription(skinToEdit.description || '');
        setImage(skinToEdit.skinData);
        setImportMode('skin');
        
        const img = new window.Image();
        img.src = skinToEdit.skinData;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 64;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, 64, 64);
          
          const skinData = ctx.getImageData(0, 0, 64, 64);
          setConversionResult({
            skinData,
            skinUrl: skinToEdit.skinData,
            previewUrl: skinToEdit.previewData || skinToEdit.skinData,
            bodyParts: new Map(),
            boundingBox: { x: 0, y: 0, width: 64, height: 64 },
          });
        };
        logger.info('Editing existing skin', { id: skinId, name: skinToEdit.name });
      }
    }
  }, [searchParams, skins]);

  const handleImageUpload = async (file: UploadFile) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageSrc = e.target?.result as string;
      setImage(imageSrc);
      await convertToSkin(imageSrc);
    };
    reader.readAsDataURL(file as unknown as File);
    return false;
  };

  const handleSkinUpload = async (file: UploadFile) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const skinSrc = e.target?.result as string;
      setImage(skinSrc);
      
      try {
        const img = new window.Image();
        img.src = skinSrc;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
        });
        
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, 64, 64);
        
        const skinData = ctx.getImageData(0, 0, 64, 64);
        const skinUrl = canvas.toDataURL('image/png');
        
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = 256;
        previewCanvas.height = 256;
        const previewCtx = previewCanvas.getContext('2d')!;
        previewCtx.imageSmoothingEnabled = false;
        previewCtx.drawImage(img, 0, 0, 256, 256);
        const previewUrl = previewCanvas.toDataURL('image/png');
        
        setConversionResult({
          skinData,
          skinUrl,
          previewUrl,
          bodyParts: new Map(),
          boundingBox: { x: 0, y: 0, width: 64, height: 64 },
        });
        
        message.success('皮肤文件已导入！');
        logger.info('Skin file imported');
      } catch (error) {
        logger.error('Failed to import skin file', error);
        message.error('导入皮肤文件失败');
      }
    };
    reader.readAsDataURL(file as unknown as File);
    return false;
  };

  const handleUpload = async (file: UploadFile) => {
    if (importMode === 'image') {
      return handleImageUpload(file);
    } else {
      return handleSkinUpload(file);
    }
  };

  const convertToSkin = async (imageSrc: string) => {
    setIsConverting(true);
    setConversionProgress({ stage: '准备中', progress: 0 });
    
    try {
      logger.info('Starting skin conversion');
      
      const result = await skinConverter.convert(
        imageSrc,
        options,
        (stage, progress) => {
          setConversionProgress({ stage, progress });
        }
      );
      
      setConversionResult(result);
      setConversionProgress({ stage: '完成', progress: 100 });
      message.success('皮肤转换成功！');
      logger.info('Skin conversion completed');
    } catch (error) {
      logger.error('Skin conversion failed', error);
      message.error('转换失败，请重试');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = async () => {
    if (!conversionResult?.skinUrl) return;

    try {
      const filePath = await save({
        defaultPath: `${skinName}.png`,
        filters: [{ name: 'PNG Image', extensions: ['png'] }],
      });
      
      if (filePath) {
        const base64Data = conversionResult.skinUrl.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        await writeFile(filePath, bytes);
        message.success('皮肤已保存！');
        logger.info('Skin saved to file', { path: filePath });
      }
    } catch (error) {
      logger.error('Failed to save skin file', error);
      const link = document.createElement('a');
      link.download = `${skinName}.png`;
      link.href = conversionResult.skinUrl;
      link.click();
    }
  };

  const handleSave = async () => {
    if (!conversionResult) return;

    setIsSaving(true);
    try {
      if (editingSkinId) {
        updateSkin(editingSkinId, {
          name: skinName,
          description: skinDescription,
          skinData: conversionResult.skinUrl,
          previewData: conversionResult.previewUrl,
        });
        message.success('皮肤已更新！');
        logger.info('Skin updated', { id: editingSkinId });
      } else {
        if (saveTarget === 'local' || saveTarget === 'both') {
          const savedSkin = await saveSkin(
            skinName,
            conversionResult.skinUrl,
            conversionResult.previewUrl,
            skinDescription
          );
          if (savedSkin) {
            message.success('皮肤已保存到本地皮肤库！');
            logger.info('Skin saved to local storage');
          } else {
            message.error('保存到本地失败');
            return;
          }
        }
        
        if (saveTarget === 'server' || saveTarget === 'both') {
          if (!user || !token) {
            message.warning('请先登录以保存到云端');
            return;
          }
          
          try {
            const blob = skinConverter.dataUrlToBlob(conversionResult.skinUrl);
            const file = new File([blob], `${skinName}.png`, { type: 'image/png' });
            const uploadResult = await apiService.uploadSkin(file);
            
            await apiService.createSkin({
              name: skinName,
              description: skinDescription,
              filePath: uploadResult.filePath,
              previewPath: conversionResult.previewUrl,
              isPublic: false,
            });
            
            message.success('皮肤已保存到云端！');
            logger.info('Skin saved to cloud');
          } catch (serverError) {
            logger.error('Failed to save to cloud', serverError);
            if (saveTarget === 'both') {
              message.warning('本地保存成功，但云端保存失败');
            } else {
              message.error('保存到云端失败');
            }
          }
        }
      }
    } catch (error) {
      logger.error('Save error', error);
      message.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOptionChange = (key: keyof ConversionOptions, value: number | boolean) => {
    const newOptions = { ...options, [key]: value };
    setOptions(newOptions);
    
    if (image && importMode === 'image') {
      convertToSkin(image);
    }
  };

  const handleEditorChange = useCallback((imageData: ImageData) => {
    if (!conversionResult) return;

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    const newSkinUrl = canvas.toDataURL('image/png');
    setConversionResult({
      ...conversionResult,
      skinData: imageData,
      skinUrl: newSkinUrl,
    });
  }, [conversionResult]);

  return (
    <div className={styles.container}>
      <Row gutter={24}>
        <Col span={10}>
          <Card
            title="导入"
            className={styles.card}
            extra={
              <Button icon={<SettingOutlined />} onClick={() => setShowSettings(true)}>
                设置
              </Button>
            }
          >
            <div className={styles.modeSelector}>
              <Text>导入模式：</Text>
              <Radio.Group value={importMode} onChange={(e) => {
                setImportMode(e.target.value);
                setImage(null);
                setConversionResult(null);
              }}>
                <Radio.Button value="image">
                  <FileImageOutlined /> 图片转换
                </Radio.Button>
                <Radio.Button value="skin">
                  <SkinOutlined /> 皮肤文件
                </Radio.Button>
              </Radio.Group>
            </div>

            <Upload.Dragger
              accept={importMode === 'image' ? 'image/*' : '.png'}
              beforeUpload={handleUpload}
              showUploadList={false}
              className={styles.uploader}
              disabled={isConverting}
            >
              {image ? (
                <img src={image} alt="preview" className={styles.previewImage} />
              ) : (
                <div className={styles.uploadPlaceholder}>
                  <UploadOutlined className={styles.uploadIcon} />
                  <p>{importMode === 'image' ? '点击或拖拽图片到此区域' : '点击或拖拽皮肤文件到此区域'}</p>
                  <p className={styles.hint}>
                    {importMode === 'image' ? '支持 JPG、PNG 格式' : '支持 64x64 或 64x32 PNG 皮肤文件'}
                  </p>
                </div>
              )}
            </Upload.Dragger>

            {isConverting && conversionProgress && (
              <div className={styles.progressContainer}>
                <Progress 
                  percent={conversionProgress.progress} 
                  status="active"
                  format={() => conversionProgress.stage}
                />
              </div>
            )}

            {importMode === 'image' && (
              <div className={styles.optionsPanel}>
                <div className={styles.optionItem}>
                  <span>使用AI检测</span>
                  <Switch
                    checked={options.useAI}
                    onChange={(checked: boolean) => handleOptionChange('useAI', checked)}
                  />
                </div>
                <div className={styles.optionItem}>
                  <span>自动去除背景</span>
                  <Switch
                    checked={options.removeBackground}
                    onChange={(checked: boolean) => handleOptionChange('removeBackground', checked)}
                  />
                </div>
                {options.removeBackground && (
                  <div className={styles.optionItem}>
                    <span>背景容差</span>
                    <Slider
                      value={options.backgroundTolerance}
                      onChange={(value: number) => handleOptionChange('backgroundTolerance', value)}
                      min={0}
                      max={100}
                      style={{ width: 150 }}
                    />
                  </div>
                )}
              </div>
            )}
          </Card>

          {importMode === 'image' && (
            <Card title="调整参数" className={styles.card}>
              <div className={styles.sliderGroup}>
                <div className={styles.sliderItem}>
                  <span>亮度</span>
                  <Slider
                    value={(options.brightness || 1) * 100}
                    onChange={(value: number) => handleOptionChange('brightness', value / 100)}
                    min={50}
                    max={150}
                  />
                </div>
                <div className={styles.sliderItem}>
                  <span>对比度</span>
                  <Slider
                    value={(options.contrast || 1) * 100}
                    onChange={(value: number) => handleOptionChange('contrast', value / 100)}
                    min={50}
                    max={150}
                  />
                </div>
                <div className={styles.sliderItem}>
                  <span>饱和度</span>
                  <Slider
                    value={(options.saturation || 1) * 100}
                    onChange={(value: number) => handleOptionChange('saturation', value / 100)}
                    min={0}
                    max={200}
                  />
                </div>
              </div>
            </Card>
          )}
        </Col>

        <Col span={14}>
          <Card
            title="皮肤预览"
            className={styles.card}
            extra={
              <Space>
                <Input
                  value={skinName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSkinName(e.target.value)}
                  placeholder="皮肤名称"
                  style={{ width: 120 }}
                />
                <Select
                  value={saveTarget}
                  onChange={setSaveTarget}
                  style={{ width: 100 }}
                  options={[
                    { value: 'local', label: '本地' },
                    { value: 'server', label: '云端' },
                    { value: 'both', label: '本地+云端' },
                  ]}
                />
                <Button 
                  icon={<SaveOutlined />} 
                  onClick={handleSave} 
                  loading={isSaving}
                  disabled={!conversionResult}
                >
                  保存
                </Button>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleDownload}
                  disabled={!conversionResult}
                >
                  导出
                </Button>
              </Space>
            }
          >
            <div style={{ marginBottom: 16 }}>
              <Input
                value={skinDescription}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSkinDescription(e.target.value)}
                placeholder="皮肤描述（可选）"
              />
            </div>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'convert',
                  label: (
                    <span>
                      <EyeOutlined />
                      3D预览
                    </span>
                  ),
                  children: (
                    <div className={styles.previewContainer}>
                      <SkinPreview3D
                        skinUrl={conversionResult?.skinUrl || null}
                        width={400}
                        height={400}
                        animate={true}
                      />
                      {conversionResult?.skinUrl && (
                        <div className={styles.skin2DPreview}>
                          <h4>皮肤贴图</h4>
                          <img
                            src={conversionResult.skinUrl}
                            alt="skin texture"
                            className={styles.skinTexture}
                          />
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'edit',
                  label: (
                    <span>
                      <EditOutlined />
                      像素编辑
                    </span>
                  ),
                  children: (
                    <div className={styles.editorContainer}>
                      {conversionResult?.skinData ? (
                        <PixelEditor
                          initialImageData={conversionResult.skinData}
                          onImageChange={handleEditorChange}
                          width={512}
                          height={512}
                        />
                      ) : (
                        <div className={styles.noSkin}>
                          <p>请先导入图片或皮肤文件</p>
                        </div>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title="转换设置"
        open={showSettings}
        onCancel={() => setShowSettings(false)}
        footer={null}
      >
        <div className={styles.settingsModal}>
          <div className={styles.settingItem}>
            <span>使用AI姿态检测</span>
            <Switch 
              checked={options.useAI}
              onChange={(checked: boolean) => handleOptionChange('useAI', checked)}
            />
          </div>
          <div className={styles.settingItem}>
            <span>使用图像分割</span>
            <Switch 
              checked={options.useSegmentation}
              onChange={(checked: boolean) => handleOptionChange('useSegmentation', checked)}
            />
          </div>
          <div className={styles.settingItem}>
            <span>自动检测身体部位</span>
            <Switch defaultChecked />
          </div>
          <div className={styles.settingItem}>
            <span>生成外层皮肤</span>
            <Switch defaultChecked />
          </div>
          <div className={styles.settingItem}>
            <span>像素化效果</span>
            <Switch defaultChecked />
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Editor;

import { useState, useRef, useCallback } from 'react';
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
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  SaveOutlined,
  EyeOutlined,
  EditOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { PixelEditor, SkinPreview3D } from '@/components';
import { skinConverter, ConversionOptions, ConversionResult } from '@/utils';
import styles from './Editor.module.css';

function Editor() {
  const [image, setImage] = useState<string | null>(null);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [skinName, setSkinName] = useState('我的皮肤');
  const [activeTab, setActiveTab] = useState('convert');
  const [isSaving, setIsSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [options, setOptions] = useState<Partial<ConversionOptions>>({
    removeBackground: true,
    backgroundTolerance: 50,
    brightness: 1.0,
    contrast: 1.0,
    saturation: 1.0,
  });

  const handleUpload = async (file: UploadFile) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageSrc = e.target?.result as string;
      setImage(imageSrc);
      await convertToSkin(imageSrc);
    };
    reader.readAsDataURL(file as unknown as File);
    return false;
  };

  const convertToSkin = async (imageSrc: string) => {
    try {
      message.loading({ content: '正在转换皮肤...', key: 'convert' });
      
      const result = await skinConverter.convert(imageSrc, options);
      setConversionResult(result);
      
      message.success({ content: '皮肤转换成功！', key: 'convert' });
    } catch (error) {
      message.error({ content: '转换失败，请重试', key: 'convert' });
      console.error('Skin conversion error:', error);
    }
  };

  const handleDownload = () => {
    if (!conversionResult?.skinUrl) return;

    const link = document.createElement('a');
    link.download = `${skinName}.png`;
    link.href = conversionResult.skinUrl;
    link.click();
    message.success('皮肤已下载！');
  };

  const handleSave = async () => {
    if (!conversionResult) return;

    setIsSaving(true);
    try {
      const skinData = {
        name: skinName,
        skinUrl: conversionResult.skinUrl,
        previewUrl: conversionResult.previewUrl,
        createdAt: new Date().toISOString(),
      };

      const savedSkins = JSON.parse(localStorage.getItem('superskin_skins') || '[]');
      savedSkins.push(skinData);
      localStorage.setItem('superskin_skins', JSON.stringify(savedSkins));

      message.success('皮肤已保存到本地！');
    } catch (error) {
      message.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOptionChange = (key: keyof ConversionOptions, value: number | boolean) => {
    const newOptions = { ...options, [key]: value };
    setOptions(newOptions);
    
    if (image) {
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
            title="上传图片"
            className={styles.card}
            extra={
              <Button icon={<SettingOutlined />} onClick={() => setShowSettings(true)}>
                设置
              </Button>
            }
          >
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

            <div className={styles.optionsPanel}>
              <div className={styles.optionItem}>
                <span>自动去除背景</span>
                <Switch
                  checked={options.removeBackground}
                  onChange={(checked) => handleOptionChange('removeBackground', checked)}
                />
              </div>
              {options.removeBackground && (
                <div className={styles.optionItem}>
                  <span>背景容差</span>
                  <Slider
                    value={options.backgroundTolerance}
                    onChange={(value) => handleOptionChange('backgroundTolerance', value)}
                    min={0}
                    max={100}
                    style={{ width: 150 }}
                  />
                </div>
              )}
            </div>
          </Card>

          <Card title="调整参数" className={styles.card}>
            <div className={styles.sliderGroup}>
              <div className={styles.sliderItem}>
                <span>亮度</span>
                <Slider
                  value={(options.brightness || 1) * 100}
                  onChange={(value) => handleOptionChange('brightness', value / 100)}
                  min={50}
                  max={150}
                />
              </div>
              <div className={styles.sliderItem}>
                <span>对比度</span>
                <Slider
                  value={(options.contrast || 1) * 100}
                  onChange={(value) => handleOptionChange('contrast', value / 100)}
                  min={50}
                  max={150}
                />
              </div>
              <div className={styles.sliderItem}>
                <span>饱和度</span>
                <Slider
                  value={(options.saturation || 1) * 100}
                  onChange={(value) => handleOptionChange('saturation', value / 100)}
                  min={0}
                  max={200}
                />
              </div>
            </div>
          </Card>
        </Col>

        <Col span={14}>
          <Card
            title="皮肤预览"
            className={styles.card}
            extra={
              <Space>
                <Input
                  value={skinName}
                  onChange={(e) => setSkinName(e.target.value)}
                  placeholder="皮肤名称"
                  style={{ width: 150 }}
                />
                <Button icon={<SaveOutlined />} onClick={handleSave} loading={isSaving}>
                  保存
                </Button>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleDownload}
                  disabled={!conversionResult}
                >
                  导出皮肤
                </Button>
              </Space>
            }
          >
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
                          <p>请先上传图片生成皮肤</p>
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

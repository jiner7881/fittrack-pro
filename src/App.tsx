import { useState, useEffect } from 'react';
import { ConfigProvider, theme, Modal, Button, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { NavigationContext } from './core/contexts';
import { initDB } from './core/db';
import MainLayout from './shared/components/MainLayout';
import './index.css';

// PWA install prompt type
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [dbReady, setDbReady] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    initDB().then(() => setDbReady(true));
  }, []);

  // PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowInstallModal(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Online/Offline detection
  useEffect(() => {
    const onOffline = () => {
      setIsOffline(true);
      message.info('当前处于离线状态，部分功能可能受限');
    };
    const onOnline = () => {
      setIsOffline(false);
      message.success('网络已恢复');
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      message.success('已添加到主屏幕');
    }
    setInstallPrompt(null);
    setShowInstallModal(false);
  };

  if (!dbReady) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: 18,
        color: '#666',
      }}>
        FitTrack Pro 加载中...
      </div>
    );
  }

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1A5276',
          borderRadius: 8,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
      }}
    >
      <NavigationContext.Provider value={{ activeTab, setActiveTab }}>
        {/* Offline banner */}
        {isOffline && (
          <div style={{
            background: '#faad14',
            color: '#595959',
            textAlign: 'center',
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 500,
          }}>
            离线模式 - 数据仅保存在本地
          </div>
        )}
        <MainLayout />
      </NavigationContext.Provider>

      {/* PWA Install Modal */}
      <Modal
        open={showInstallModal}
        title="安装 FitTrack Pro"
        onCancel={() => setShowInstallModal(false)}
        footer={[
          <Button key="later" onClick={() => setShowInstallModal(false)}>以后再说</Button>,
          <Button key="install" type="primary" onClick={handleInstall}>安装到主屏幕</Button>,
        ]}
      >
        <div style={{ padding: '8px 0' }}>
          <p>将 FitTrack Pro 添加到主屏幕，享受：</p>
          <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
            <li>像原生应用一样启动</li>
            <li>离线访问训练和饮食数据</li>
            <li>更快的加载速度</li>
          </ul>
        </div>
      </Modal>
    </ConfigProvider>
  );
}

export default App;

import { useContext, lazy, Suspense } from 'react';
import {
  HomeOutlined,
  TrophyOutlined,
  ThunderboltOutlined,
  CoffeeOutlined,
  BarChartOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { NavigationContext } from '../../core/contexts';

// Lazy load all pages for code splitting
const HomePage = lazy(() => import('../../features/home/HomePage'));
const ExercisePage = lazy(() => import('../../features/exercises/ExercisePage'));
const TrainingPage = lazy(() => import('../../features/training/TrainingPage'));
const DietPage = lazy(() => import('../../features/diet/DietPage'));
const AnalyticsPage = lazy(() => import('../../features/analytics/AnalyticsPage'));
const ProfilePage = lazy(() => import('../../features/profile/ProfilePage'));

const tabs = [
  { key: 'home', label: '首页', icon: <HomeOutlined /> },
  { key: 'exercises', label: '动作', icon: <TrophyOutlined /> },
  { key: 'training', label: '训练', icon: <ThunderboltOutlined /> },
  { key: 'diet', label: '饮食', icon: <CoffeeOutlined /> },
  { key: 'analytics', label: '分析', icon: <BarChartOutlined /> },
  { key: 'profile', label: '我的', icon: <UserOutlined /> },
];

const pageMap: Record<string, React.LazyExoticComponent<React.FC>> = {
  home: HomePage,
  exercises: ExercisePage,
  training: TrainingPage,
  diet: DietPage,
  analytics: AnalyticsPage,
  profile: ProfilePage,
};

function PageFallback() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '60vh',
      color: '#999',
      fontSize: 14,
    }}>
      加载中...
    </div>
  );
}

export default function MainLayout() {
  const { activeTab, setActiveTab } = useContext(NavigationContext);
  const CurrentPage = pageMap[activeTab] || HomePage;

  return (
    <div className="app-container">
      <div className="page-container">
        <Suspense fallback={<PageFallback />}>
          <CurrentPage />
        </Suspense>
      </div>

      <div className="tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="icon">{tab.icon}</span>
            <span className="label">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

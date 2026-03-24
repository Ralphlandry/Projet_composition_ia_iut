import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import { useLanguage } from '@/hooks/useLanguage';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
}

const AppLayout = ({ children, title }: AppLayoutProps) => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:pl-[260px] flex flex-col min-h-screen">
        <Header title={t(title)} />
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
};

export default AppLayout;

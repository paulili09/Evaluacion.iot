import React from 'react';
import { Lightbulb, Clock, Zap, Settings } from 'lucide-react';

export type TabType = 'luces' | 'automatizacion' | 'consumo' | 'ajustes';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  unreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadCount = 4,
}) => {
  const tabs = [
    {
      id: 'luces' as TabType,
      label: 'Luces',
      icon: Lightbulb,
    },
    {
      id: 'automatizacion' as TabType,
      label: 'Automatización',
      icon: Clock,
      badge: unreadCount,
    },
    {
      id: 'consumo' as TabType,
      label: 'Consumo',
      icon: Zap,
    },
    {
      id: 'ajustes' as TabType,
      label: 'Ajustes',
      icon: Settings,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B111E]/95 backdrop-blur-lg border-t border-slate-800/80 px-4 py-2 safe-bottom max-w-md mx-auto md:max-w-2xl lg:max-w-4xl">
      <div className="grid grid-cols-4 items-center gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-6 h-6 transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'
                  }`}
                />
                {tab.badge && tab.badge > 0 && !isActive ? (
                  <span className="absolute -top-1 -right-2.5 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center shadow-sm">
                    {tab.badge}
                  </span>
                ) : null}
              </div>

              <span className="text-[11px] mt-1 tracking-tight truncate">
                {tab.label}
              </span>

              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5 shadow-sm shadow-amber-400/50" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

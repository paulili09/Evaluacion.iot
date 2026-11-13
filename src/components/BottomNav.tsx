import React from 'react';
import { Lightbulb, Box, Smartphone, Clock, Server, Settings } from 'lucide-react';

export type TabType = 'luces' | 'vista3d' | 'dispositivos' | 'automatizacion' | 'consumo' | 'api' | 'ajustes';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  unreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadCount = 0,
}) => {
  const tabs = [
    { id: 'luces' as TabType, label: 'Luces', icon: Lightbulb },
    { id: 'vista3d' as TabType, label: '3D', icon: Box },
    { id: 'dispositivos' as TabType, label: 'Red IoT', icon: Smartphone },
    { id: 'automatizacion' as TabType, label: 'Reglas', icon: Clock, badge: unreadCount },
    { id: 'api' as TabType, label: 'API', icon: Server },
    { id: 'ajustes' as TabType, label: 'Ajustes', icon: Settings },
  ];

  return (
    <nav
      aria-label="Navegación móvil"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B111E]/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5"
    >
      <div className="grid grid-cols-6 items-center gap-0.5 max-w-xl mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors cursor-pointer ${
                isActive ? 'text-amber-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                {tab.badge && tab.badge > 0 && !isActive ? (
                  <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-bold flex items-center justify-center">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-full">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

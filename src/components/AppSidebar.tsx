import { AppView } from '@/types/project';
import { LayoutDashboard, GanttChart, ListTodo, ShoppingCart, HardHat, Sparkles, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface AppSidebarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  projectName: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navItems: { view: AppView; label: string; icon: React.ElementType }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'gantt', label: 'Cronograma', icon: GanttChart },
  { view: 'tasks', label: 'Tarefas (EAP)', icon: ListTodo },
  { view: 'purchases', label: 'Compras', icon: ShoppingCart },
];

export default function AppSidebar({ currentView, onViewChange, projectName, collapsed, onToggleCollapse }: AppSidebarProps) {
  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} min-h-screen flex flex-col bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-fg))] transition-all duration-300`}>
      <div className="p-3 border-b border-[hsl(var(--sidebar-border))] flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <HardHat className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-[hsl(var(--sidebar-fg))]">ObraPlanner</h1>
              <p className="text-xs opacity-60 truncate max-w-[120px]">{projectName}</p>
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md hover:bg-[hsl(var(--sidebar-hover))] transition-colors flex-shrink-0"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(({ view, label, icon: Icon }) => {
          const isActive = currentView === view;
          return (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              className={`w-full flex items-center ${collapsed ? 'justify-center' : ''} gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative`}
              title={collapsed ? label : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-primary rounded-lg"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-primary-foreground' : ''}`} />
              {!collapsed && (
                <span className={`relative z-10 ${isActive ? 'text-primary-foreground' : 'text-[hsl(var(--sidebar-fg))]'}`}>
                  {label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-2 border-t border-[hsl(var(--sidebar-border))]">
        <button
          className={`w-full flex items-center ${collapsed ? 'justify-center' : ''} gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors`}
          title={collapsed ? 'Gerar com IA' : undefined}
        >
          <Sparkles className="w-4 h-4" />
          {!collapsed && 'Gerar com IA'}
        </button>
      </div>
    </aside>
  );
}

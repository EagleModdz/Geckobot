import { useState, useEffect } from 'react';
import { Home, Settings, Bot, FolderTree, Users, Palette, LogOut, Pin, PinOff, Terminal, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GeckoLogo } from './GeckoLogo';
import { ThemePicker } from './ThemePicker';

interface SidebarProps {
  botConnected: boolean;
  botName: string;
  clientsInChannel: { id: number; name: string }[];
  onOpenChannelBrowser?: () => void;
  onOpenBotManager?: () => void;
  currentPage?: 'dashboard' | 'settings' | 'commands' | 'permissions';
  ping?: number;
}

function PingDot({ ping }: { ping: number }) {
  if (ping < 0) return null;
  const color = ping < 80 ? 'bg-green-500' : ping < 200 ? 'bg-yellow-500' : 'bg-red-500';
  const label = ping < 80 ? 'Good' : ping < 200 ? 'OK' : 'Poor';
  return (
    <span className="flex items-center gap-1" title={`Connection: ${label} (${ping}ms)`}>
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
    </span>
  );
}

export function Sidebar({ botConnected, botName, clientsInChannel, onOpenChannelBrowser, onOpenBotManager, currentPage = 'dashboard', ping = -1 }: SidebarProps) {
  const navigate = useNavigate();
  /* const { theme, setTheme } = useTheme(); */
  // theme and setTheme are now handled by ThemePicker

  const [pinned, setPinned] = useState(() => localStorage.getItem('sidebarPinned') === 'true');
  const [hovered, setHovered] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const expanded = pinned || hovered;

  useEffect(() => {
    localStorage.setItem('sidebarPinned', String(pinned));
  }, [pinned]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setThemeOpen(false); }}
      className="h-full flex-shrink-0 border-r border-border/50 bg-card/50 flex flex-col overflow-visible z-30 transition-all duration-200 ease-in-out"
      style={{ width: expanded ? 224 : 64 }}
    >
      {/* Logo + Pin */}
      <div className="flex items-center gap-2.5 px-4 py-4 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <GeckoLogo className="h-5 w-5 text-primary" />
        </div>
        {expanded && (
          <div className="flex-1 min-w-0 leading-none">
            <span className="font-semibold text-base block truncate">GeckoBot</span>
            <span className="text-[10px] text-muted-foreground/50 block">by zEagleModdz</span>
          </div>
        )}
        {expanded && (
          <button
            onClick={() => setPinned((v) => !v)}
            className="p-1 rounded hover:bg-accent/50 text-muted-foreground/50 hover:text-muted-foreground transition-colors flex-shrink-0"
            title={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
          >
            {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Bot status */}
      <div className="px-3 mb-2 flex-shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${botConnected ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
          {expanded ? (
            <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground truncate">{botName || 'Bot'}</span>
              {ping >= 0 && (
                <span
                  className={`text-[10px] font-mono flex-shrink-0 ${ping < 80 ? 'text-green-500' : ping < 200 ? 'text-yellow-500' : 'text-red-500'}`}
                  title="API latency to TS3AudioBot"
                >
                  {ping}ms
                </span>
              )}
            </div>
          ) : (
            <PingDot ping={ping} />
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 space-y-0.5 flex-shrink-0">
        <NavItem icon={Home} label="Dashboard" active={currentPage === 'dashboard'} expanded={expanded} onClick={() => navigate('/')} />
        <NavItem icon={Terminal} label="Commands" active={currentPage === 'commands'} expanded={expanded} onClick={() => navigate('/commands')} />
        <NavItem icon={Shield} label="Permissions" active={currentPage === 'permissions'} expanded={expanded} onClick={() => navigate('/permissions')} />
        <NavItem icon={Settings} label="Settings" active={currentPage === 'settings'} expanded={expanded} onClick={() => navigate('/settings')} />
        {onOpenBotManager && (
          <NavItem icon={Bot} label="Manage Bots" expanded={expanded} onClick={onOpenBotManager} />
        )}
        {onOpenChannelBrowser && (
          <NavItem icon={FolderTree} label="Channels" expanded={expanded} onClick={onOpenChannelBrowser} />
        )}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Listeners */}
      <div className="px-3 mb-1 flex-shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          {expanded ? (
            <span className="text-sm text-muted-foreground">{clientsInChannel.length} listener{clientsInChannel.length !== 1 ? 's' : ''}</span>
          ) : (
            clientsInChannel.length > 0 && (
              <span className="text-xs text-muted-foreground font-medium">{clientsInChannel.length}</span>
            )
          )}
        </div>
        {expanded && clientsInChannel.length > 0 && (
          <div className="pl-8 space-y-0.5 max-h-24 overflow-y-auto mb-1">
            {clientsInChannel.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 py-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500/60 flex-shrink-0" />
                <span className="text-xs text-muted-foreground/70 truncate">{c.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Theme switcher */}
      <div className="px-3 mb-1 flex-shrink-0">
        <button
          onClick={() => setThemeOpen(true)}
          className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors"
        >
          <Palette className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          {expanded && <span className="text-sm text-muted-foreground">Theme</span>}
        </button>
        <ThemePicker open={themeOpen} onOpenChange={setThemeOpen} />
      </div>

      {/* User + logout */}
      <div className="px-3 pb-3 flex-shrink-0 border-t border-border/30 pt-2">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-primary">
              {(user.username || 'U')[0].toUpperCase()}
            </span>
          </div>
          {expanded && (
            <>
              <span className="text-sm text-foreground truncate flex-1">{user.username || 'User'}</span>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded hover:bg-accent/50 text-muted-foreground/50 hover:text-destructive transition-colors flex-shrink-0"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  expanded,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full px-2 py-2 rounded-md transition-colors ${active
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
        }`}
      title={expanded ? undefined : label}
    >
      <Icon className="h-[18px] w-[18px] flex-shrink-0" />
      {expanded && <span className="text-sm font-medium truncate">{label}</span>}
    </button>
  );
}

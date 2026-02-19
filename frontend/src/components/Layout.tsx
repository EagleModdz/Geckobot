import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { ChannelBrowser } from '@/components/ChannelBrowser';
import { BotManager } from '@/components/BotManager';
import { useSocket } from '@/hooks/useSocket';

export function Layout() {
    const { botStatus, channels, botList, selectedBotId, ping } = useSocket();
    const [channelBrowserOpen, setChannelBrowserOpen] = useState(false);
    const [botManagerOpen, setBotManagerOpen] = useState(false);
    const location = useLocation();

    const currentPage = location.pathname === '/' ? 'dashboard' :
        location.pathname === '/settings' ? 'settings' :
        location.pathname === '/commands' ? 'commands' :
        location.pathname === '/permissions' ? 'permissions' :
            undefined;

    return (
        <div className="h-screen flex flex-row bg-background overflow-hidden">
            <Sidebar
                botConnected={botStatus.connected}
                botName={botStatus.botName}
                clientsInChannel={botStatus.clientsInChannel}
                onOpenChannelBrowser={() => setChannelBrowserOpen(true)}
                onOpenBotManager={() => setBotManagerOpen(true)}
                currentPage={currentPage}
                ping={ping}
            />

            {/* Main Content */}
            <Outlet />

            {/* Global Dialogs */}
            <ChannelBrowser
                open={channelBrowserOpen}
                onOpenChange={setChannelBrowserOpen}
                channels={channels}
                currentChannelName={botStatus.channelName}
            />
            <BotManager
                open={botManagerOpen}
                onOpenChange={setBotManagerOpen}
                botList={botList}
                selectedBotId={selectedBotId}
                activeBotName={botStatus.botName}
            />
        </div>
    );
}

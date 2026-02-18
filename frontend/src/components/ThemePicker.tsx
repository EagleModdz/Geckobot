import { X, Check } from 'lucide-react';
import { useTheme, themes, type ThemeId } from '@/hooks/useTheme';

interface ThemePickerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ThemePicker({ open, onOpenChange }: ThemePickerProps) {
    const { theme, setTheme } = useTheme();

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={() => onOpenChange(false)} />

            <div className="relative z-50 w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/30">
                    <div>
                        <h2 className="text-lg font-semibold">Select Theme</h2>
                        <p className="text-sm text-muted-foreground">Choose your preferred appearance</p>
                    </div>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="p-2 rounded-lg hover:bg-accent hover:text-foreground text-muted-foreground transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {themes.map((t) => {
                            const isActive = theme === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id as ThemeId)}
                                    className={`
                    group relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200
                    ${isActive
                                            ? 'border-primary bg-primary/5 shadow-md scale-[1.02]'
                                            : 'border-transparent bg-secondary/50 hover:bg-secondary hover:border-border hover:scale-[1.02] active:scale-[0.98]'
                                        }
                  `}
                                >
                                    {/* Color Preview */}
                                    <div
                                        className={`
                      w-16 h-16 rounded-full shadow-md ring-4 ring-offset-4 ring-offset-card ring-transparent flex-shrink-0
                      ${isActive ? 'ring-primary' : 'group-hover:ring-border/50'}
                      transition-all duration-300
                    `}
                                        style={{ background: t.gradient || t.color }}
                                    />

                                    {/* Label */}
                                    <span className={`text-sm font-semibold truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>
                                        {t.name}
                                    </span>

                                    {/* Active Indicator (Corner Check) */}
                                    {isActive && (
                                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg animate-in zoom-in">
                                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

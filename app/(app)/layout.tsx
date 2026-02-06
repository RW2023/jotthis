import { CommandPalette } from '@/components/CommandPalette';
import { NotesProvider } from '@/components/NotesProvider';

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <NotesProvider>
            <CommandPalette />
            {children}
        </NotesProvider>
    );
}

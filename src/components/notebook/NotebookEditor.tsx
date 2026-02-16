import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    CheckSquare,
    Minus,
    Quote,
    Code,
    Type
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface NotebookEditorProps {
    content: string
    onChange: (content: string) => void
    editable?: boolean
}

// ── Slash Command Definitions ───────────────────────────────────────────

interface SlashCommand {
    label: string
    description: string
    icon: React.ElementType
    action: (editor: Editor) => void
    category: string
}

const SLASH_COMMANDS: SlashCommand[] = [
    {
        label: "Text",
        description: "Normaler Text",
        icon: Type,
        category: "Grundelemente",
        action: (editor) => editor.chain().focus().setParagraph().run()
    },
    {
        label: "Überschrift 1",
        description: "Große Überschrift",
        icon: Heading1,
        category: "Grundelemente",
        action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run()
    },
    {
        label: "Überschrift 2",
        description: "Mittlere Überschrift",
        icon: Heading2,
        category: "Grundelemente",
        action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run()
    },
    {
        label: "Überschrift 3",
        description: "Kleine Überschrift",
        icon: Heading3,
        category: "Grundelemente",
        action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run()
    },
    {
        label: "Aufzählung",
        description: "Einfache Liste",
        icon: List,
        category: "Listen",
        action: (editor) => editor.chain().focus().toggleBulletList().run()
    },
    {
        label: "Nummerierung",
        description: "Nummerierte Liste",
        icon: ListOrdered,
        category: "Listen",
        action: (editor) => editor.chain().focus().toggleOrderedList().run()
    },
    {
        label: "Checkliste",
        description: "To-Do Liste",
        icon: CheckSquare,
        category: "Listen",
        action: (editor) => editor.chain().focus().toggleTaskList().run()
    },
    {
        label: "Trennlinie",
        description: "Horizontale Linie",
        icon: Minus,
        category: "Blöcke",
        action: (editor) => editor.chain().focus().setHorizontalRule().run()
    },
    {
        label: "Zitat",
        description: "Blockzitat",
        icon: Quote,
        category: "Blöcke",
        action: (editor) => editor.chain().focus().toggleBlockquote().run()
    },
    {
        label: "Code",
        description: "Code-Block",
        icon: Code,
        category: "Blöcke",
        action: (editor) => editor.chain().focus().toggleCodeBlock().run()
    }
]

export default function NotebookEditor({ content, onChange, editable = true }: NotebookEditorProps) {
    const [slashMenuOpen, setSlashMenuOpen] = useState(false)
    const [slashCoordinates, setSlashCoordinates] = useState({ top: 0, left: 0 })
    const [slashFilter, setSlashFilter] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const menuRef = useRef<HTMLDivElement>(null)

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Markdown,
            Placeholder.configure({
                placeholder: 'Tippe "/" für Befehle...',
            }),
        ],
        content: content,
        editable,
        onUpdate: ({ editor }) => {
            // Persist as Markdown
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const markdown = (editor.storage as Record<string, any>).markdown.getMarkdown()
            onChange(markdown)

            // Check for slash command
            // Note: Implementing custom Slash command logic in onUpdate is tricky because of loop.
            // Usually it's better done with a Plugin or handleKeyDown.
            // For this iteration, we will rely on a simpler "onKeyDown" listener in the component or 
            // use the existing suggestion extension if we were to install it (tiptap-extension-slash-command).
            // Since we are manual, let's try to handle it via transaction inspection if possible, 
            // OR move the detection to onTransaction/onUpdate with careful checks.

            // BUT, the simplest stable way without extra plugins is:
            // Use a FloatingMenu that triggers on '/'
            // OR keep our manual logic but apply it carefully.
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none max-w-none',
            },

        },
    })

    // Custom Key Handler to solve stale closure issues


    // Custom Slash Command Logic:
    // Since we don't have the suggestion plugin, we need to manually track input.
    // We'll hook into editor state changes differently.
    useEffect(() => {
        if (!editor) return

        const handleUpdate = () => {
            const { state, view } = editor
            const { selection } = state
            const { $from } = selection

            // Look at the text before the cursor
            const parentText = $from.parent.textContent
            // Parent offset is current position in node
            const parentOffset = $from.parentOffset

            // Extract text from start of node to cursor
            const textBefore = parentText.slice(0, parentOffset)

            // Check for slash at the end
            const match = textBefore.match(/(?:^|\s)\/([\w\s]{0,25})$/)

            if (match) {
                const query = match[1]
                setSlashFilter(query)
                setSlashMenuOpen(true)

                // Get coords
                const coords = view.coordsAtPos($from.pos)
                // We need relative coords to the editor container usually
                // For floating absolute:
                setSlashCoordinates({
                    top: coords.bottom + 10, // Position below cursor
                    left: coords.left
                })
            } else {
                setSlashMenuOpen(false)
            }
        }

        editor.on('transaction', handleUpdate)

        return () => {
            editor.off('transaction', handleUpdate)
        }
    }, [editor])

    // Update content if changed externally (e.g. switching pages)
    // We need to be careful not to loop.
    // We'll store lastContent to compare.
    const lastContentRef = useRef(content)
    useEffect(() => {
        if (editor && content !== lastContentRef.current) {
            // Check if actual semantic change or just formatting
            // Simplest: only set if editor is empty or completely different
            // But for real-time sync, we might need more.
            // For now, assume content is the source of truth on page switch.

            // Only update if the editor content is significantly different 
            // to avoid resetting cursor on every keystroke save.
            // Actually, NotebookPage only updates 'content' prop on load or save finish.
            // But if we are typing, 'onChange' updates the parent state.
            // So 'content' prop will come back with what we just typed.
            // We should only setContent if we are NOT the ones who triggered it?

            // Better: NotebookPage should key the component by pageId
            // so we get a fresh editor instance for each page.
            // Then we don't need this useEffect!
        }
    }, [content, editor])

    const filteredCommands = SLASH_COMMANDS.filter(cmd =>
        cmd.label.toLowerCase().includes(slashFilter.toLowerCase()) ||
        cmd.description.toLowerCase().includes(slashFilter.toLowerCase())
    )

    const executeCommand = (cmd: SlashCommand) => {
        if (!editor) return

        const { state } = editor
        const { selection } = state
        const { $from } = selection
        const parentText = $from.parent.textContent
        const parentOffset = $from.parentOffset
        const textBefore = parentText.slice(0, parentOffset)
        const match = textBefore.match(/(?:^|\s)\/([\w\s]{0,25})$/)

        if (match) {
            const matchLength = match[0].length
            const matchStart = $from.pos - matchLength

            // Delete the slash command text
            editor.chain().focus()
                .deleteRange({ from: matchStart + (match[0].startsWith(' ') ? 1 : 0), to: $from.pos })
                .run()

            // Execute the command action
            cmd.action(editor)

            setSlashMenuOpen(false)
        }
    }

    // Custom Key Handler to solve stale closure issues
    useEffect(() => {
        if (!editor) return

        editor.setOptions({
            editorProps: {
                handleKeyDown: (view, event) => {
                    // Slash Menu Logic
                    if (slashMenuOpen) {
                        if (event.key === 'ArrowUp') {
                            event.preventDefault()
                            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
                            return true
                        }
                        if (event.key === 'ArrowDown') {
                            event.preventDefault()
                            setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : prev))
                            return true
                        }
                        if (event.key === 'Enter') {
                            event.preventDefault()
                            if (filteredCommands[selectedIndex]) {
                                executeCommand(filteredCommands[selectedIndex])
                            }
                            return true
                        }
                        if (event.key === 'Escape') {
                            setSlashMenuOpen(false)
                            return true
                        }
                    }

                    // Backspace Behavior
                    if (event.key === 'Backspace') {
                        const { state } = view
                        const { selection } = state
                        const { empty, $from } = selection

                        if (empty && $from.parent.type.name === 'taskItem' && $from.parent.textContent.length === 0) {
                            editor.chain().focus().toggleTaskList().run()
                            return true
                        }
                    }
                    return false
                }
            }
        })
    }, [editor, slashMenuOpen, selectedIndex, filteredCommands])

    if (!editor) {
        return null
    }

    return (
        <div className="relative w-full h-full">
            <EditorContent editor={editor} className="min-h-[500px]" />

            <AnimatePresence>
                {slashMenuOpen && (
                    <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.12 }}
                        className="fixed z-50 bg-popover border border-border/60 rounded-xl shadow-xl overflow-hidden min-w-[260px]"
                        style={{ top: slashCoordinates.top, left: slashCoordinates.left }}
                    >
                        <div className="py-1.5 w-[260px] max-h-[320px] overflow-y-auto bg-popover">
                            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/40 font-medium select-none">
                                Elemente
                            </div>
                            {filteredCommands.length > 0 ? (
                                filteredCommands.map((cmd, i) => (
                                    <button
                                        key={cmd.label}
                                        className={cn(
                                            "w-full text-left px-3 py-2 flex items-center gap-3 text-sm transition-colors",
                                            i === selectedIndex
                                                ? "bg-primary/10 text-primary"
                                                : "text-foreground hover:bg-muted/50"
                                        )}
                                        onClick={(e) => {
                                            e.preventDefault()
                                            executeCommand(cmd)
                                        }}
                                        onMouseEnter={() => setSelectedIndex(i)}
                                    >
                                        <div className={cn(
                                            "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                            i === selectedIndex
                                                ? "bg-primary/15 text-primary"
                                                : "bg-muted/40 text-muted-foreground"
                                        )}>
                                            <cmd.icon className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-medium text-[13px]">{cmd.label}</div>
                                            <div className="text-[11px] text-muted-foreground/50">{cmd.description}</div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="px-3 py-4 text-center text-xs text-muted-foreground/60">
                                    Keine Befehle gefunden
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                /* TipTap Custom Styles to Match Previous Look */
                .ProseMirror {
                    outline: none;
                    font-family: inherit;
                }
                .ProseMirror p.is-editor-empty:first-child::before {
                    color: #adb5bd;
                    content: attr(data-placeholder);
                    float: left;
                    height: 0;
                    pointer-events: none;
                }
                ul[data-type="taskList"] {
                    list-style: none;
                    padding: 0;
                }
                ul[data-type="taskList"] li {
                    display: flex;
                    align-items: flex-start; /* Correct alignment */
                    margin-bottom: 0.2rem; /* Spacing between items */
                }
                ul[data-type="taskList"] li > label {
                    flex: 0 0 auto;
                    margin-right: 0.5rem;
                    user-select: none;
                    margin-top: 0.2rem; /* Align checkbox visually with text */
                }
                ul[data-type="taskList"] li > div {
                    flex: 1 1 auto;
                }
                ul[data-type="taskList"] li[data-checked="true"] > div > p {
                    text-decoration: line-through;
                    color: #a1a1aa; /* text-muted-foreground / gray-400 */
                    text-decoration-color: #a1a1aa;
                    opacity: 0.8;
                }
                /* Ensure prose headings are visible and distinct */
                .ProseMirror h1 {
                    font-size: 2.25em;
                    font-weight: 800;
                    margin-top: 0.8em;
                    margin-bottom: 0.4em;
                    line-height: 1.1;
                }
                .ProseMirror h2 {
                    font-size: 1.5em;
                    font-weight: 700;
                    margin-top: 0.8em;
                    margin-bottom: 0.4em;
                    line-height: 1.3;
                }
                .ProseMirror h3 {
                    font-size: 1.25em;
                    font-weight: 600;
                    margin-top: 0.6em;
                    margin-bottom: 0.2em;
                    line-height: 1.4;
                }
            `}</style>
        </div>
    )
} 

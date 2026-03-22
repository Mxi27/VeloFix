export interface ChecklistItem {
    text: string
    completed: boolean
    type?: 'acceptance' | 'service'
    completed_by?: string | null
    completed_at?: string | null
    description?: string | null
    template_id?: string | null
    template_name?: string | null
    notes?: string | null
}

export interface ChecklistTemplate {
    id: string
    name: string
    description?: string | null
    items: {
        text: string
        description?: string | null
    }[]
}

import { supabase } from "@/lib/supabase"

export interface OrderHistoryEvent {
    id: string
    type: 'creation' | 'status_change' | 'assignment' | 'service' | 'info' | 'control' | 'service_step' | 'control_step' | 'checklist_update' | 'status'
    title: string
    description?: string
    timestamp: string
    actor?: {
        id: string
        name: string
    }
    metadata?: {
        checklist_count?: number
        old_status?: string
        new_status?: string
        [key: string]: any
    }
}

export async function logOrderEvent(
    orderId: string,
    event: Omit<OrderHistoryEvent, 'id' | 'timestamp'>,
    user?: { id: string; email?: string; user_metadata?: { full_name?: string } } | null
) {
    const historyEvent: OrderHistoryEvent = {
        ...event,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        actor: event.actor || (user ? {
            id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unbekannt'
        } : undefined)
    }

    const { error } = await supabase.rpc('append_order_history', {
        p_order_id: orderId,
        p_event: historyEvent
    })

    if (error) {
        console.error('Failed to append order history:', error)
        throw error
    }

    return historyEvent
}

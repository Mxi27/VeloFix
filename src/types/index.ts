/**
 * Shared application-level TypeScript types.
 * DB schema types live in src/types/supabase.ts
 * Checklist-specific types live in src/types/checklist.ts
 */

import type { Database } from './supabase'

// ─── Convenience DB Row Aliases ─────────────────────────────────────────────

export type WorkshopTag = Database['public']['Tables']['workshop_tags']['Row']

// ─── Leasing ─────────────────────────────────────────────────────────────────

export interface LeasingDetails {
    provider?: string | null
    contract_id?: string | null
    service_package?: string | null
    inspection_code?: string | null
    pickup_code?: string | null
    private_email?: string | null
}

// ─── Intake Requests ─────────────────────────────────────────────────────────

/** Partial shape of intake_requests rows as used in CreateOrderModal */
export interface IntakeRequestSummary {
    id: string
    created_at: string
    status: string
    intake_type?: 'standard' | 'leasing' | null
    customer_name: string
    customer_email?: string | null
    customer_phone?: string | null
    /** Portal / leasing portal email */
    email?: string | null
    private_email?: string | null
    bike_brand?: string | null
    bike_model?: string | null
    bike_type?: string | null
    bike_color?: string | null
    description?: string | null
    due_date?: string | null
    leasing_provider?: string | null
    contract_id?: string | null
    service_package?: string | null
    inspection_code?: string | null
    pickup_code?: string | null
}

// ─── Bike Build / Assembly ────────────────────────────────────────────────────

export interface AssemblyProgress {
    completed_steps?: string[]
    skipped_steps?: string[]
    remaining_steps?: string[]
    total_steps?: number
}

export interface ControlData {
    [checkpointId: string]: boolean | string | null
}

// ─── Order History ────────────────────────────────────────────────────────────

export interface HistoryItemEntry {
    text: string
    actor?: { id: string; name: string }
    timestamp: string
}

export interface GroupedHistoryEvent {
    id: string
    type: 'service' | 'control' | 'status'
    title: string
    timestamp: string
    actor?: { id: string; name: string }
    description?: string
    hasMixedActors: boolean
    metadata: {
        items: HistoryItemEntry[]
        checklist_count: number
        rating?: number
        feedback?: string
    }
}

// ─── Shared Order Type (used in mode pages) ───────────────────────────────────

/** Full order shape used across OrderDetailPage, ControlModePage, ServiceModePage */
export interface WorkshopOrder {
    id: string
    order_number: string
    workshop_id: string
    customer_name: string
    customer_email: string | null
    customer_phone: string | null
    bike_brand: string | null
    bike_model: string | null
    bike_color: string | null
    bike_type: string | null
    is_leasing: boolean
    leasing_provider: string | null
    leasing_portal_email: string | null
    status: string
    created_at: string
    updated_at: string
    estimated_price: number | null
    final_price: number | null
    checklist: import('./checklist').ChecklistItem[] | null
    notes: string[] | null
    internal_note: string | null
    customer_note: string | null
    contract_id: string | null
    service_package: string | null
    inspection_code: string | null
    pickup_code: string | null
    leasing_code: string | null
    history: import('../lib/history').OrderHistoryEvent[] | null
    end_control: {
        steps: ControlStepItem[]
        completed: boolean
        rating?: number
        feedback?: string
    } | null
    tags: string[] | null
    mechanic_ids: string[] | null
    qc_mechanic_id: string | null
    due_date: string | null
}

// ─── Public Order Status (RPC get_public_order_status) ───────────────────────

/**
 * Extended order shape returned by the `get_public_order_status` RPC.
 * Includes joined workshop data and may use `created_date` instead of `created_at`.
 */
export interface PublicOrderStatus extends WorkshopOrder {
    created_date?: string
    workshop?: {
        id?: string
        name: string
        address?: string | null
        city?: string | null
        postal_code?: string | null
        phone?: string | null
        email?: string | null
        google_review_url?: string | null
    }
}

export interface ControlStepItem {
    id?: string
    text: string
    control_completed?: boolean
    control_notes?: string | null
    completed?: boolean
    notes?: string | null
}

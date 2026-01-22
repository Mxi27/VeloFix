export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            workshops: {
                Row: {
                    id: string
                    owner_user_id: string | null
                    name: string
                    email: string | null
                    phone: string | null
                    address: string | null
                    city: string | null
                    postal_code: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    owner_user_id?: string | null
                    name: string
                    email?: string | null
                    phone?: string | null
                    address?: string | null
                    city?: string | null
                    postal_code?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    owner_user_id?: string | null
                    name?: string
                    email?: string | null
                    phone?: string | null
                    address?: string | null
                    city?: string | null
                    postal_code?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            employees: {
                Row: {
                    id: string
                    workshop_id: string
                    user_id: string | null
                    name: string
                    email: string
                    role: 'admin' | 'write' | 'read'
                    active: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    workshop_id: string
                    user_id?: string | null
                    name: string
                    email: string
                    role?: 'admin' | 'write' | 'read'
                    active?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    workshop_id?: string
                    user_id?: string | null
                    name?: string
                    email?: string
                    role?: 'admin' | 'write' | 'read'
                    active?: boolean
                    created_at?: string
                }
            }
            orders: {
                Row: {
                    id: string
                    workshop_id: string
                    order_number: string
                    customer_name: string
                    customer_email: string | null
                    customer_phone: string | null
                    bike_brand: string | null
                    bike_model: string | null
                    bike_color: string | null
                    order_type: 'repair' | 'leasing'
                    status: string
                    estimated_price: number | null
                    final_price: number | null
                    due_date: string | null
                    created_date: string
                    updated_date: string
                    notes: Json
                    checklist: Json
                    assignments: Json
                    history: Json
                    leasing_provider: string | null
                    leasing_code: string | null
                    is_billed: boolean
                    archived: boolean
                }
                Insert: {
                    id?: string
                    workshop_id: string
                    order_number: string
                    customer_name: string
                    customer_email?: string | null
                    customer_phone?: string | null
                    bike_brand?: string | null
                    bike_model?: string | null
                    bike_color?: string | null
                    order_type?: 'repair' | 'leasing'
                    status?: string
                    estimated_price?: number | null
                    final_price?: number | null
                    due_date?: string | null
                    created_date?: string
                    updated_date?: string
                    notes?: Json
                    checklist?: Json
                    assignments?: Json
                    history?: Json
                    leasing_provider?: string | null
                    leasing_code?: string | null
                    is_billed?: boolean
                    archived?: boolean
                }
                Update: {
                    id?: string
                    workshop_id?: string
                    order_number?: string
                    customer_name?: string
                    customer_email?: string | null
                    customer_phone?: string | null
                    bike_brand?: string | null
                    bike_model?: string | null
                    bike_color?: string | null
                    order_type?: 'repair' | 'leasing'
                    status?: string
                    estimated_price?: number | null
                    final_price?: number | null
                    due_date?: string | null
                    created_date?: string
                    updated_date?: string
                    notes?: Json
                    checklist?: Json
                    assignments?: Json
                    history?: Json
                    leasing_provider?: string | null
                    leasing_code?: string | null
                    is_billed?: boolean
                    archived?: boolean
                }
            }
            checklist_templates: {
                Row: {
                    id: string
                    workshop_id: string
                    name: string
                    description: string | null
                    items: Json
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    workshop_id: string
                    name: string
                    description?: string | null
                    items?: Json
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    workshop_id?: string
                    name?: string
                    description?: string | null
                    items?: Json
                    created_at?: string
                    updated_at?: string
                }
            }
        }
    }
}

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
                    invite_code?: string | null
                    allow_guest_join?: boolean
                    bank_name?: string | null
                    iban?: string | null
                    bic?: string | null
                    tax_id?: string | null
                    ust_id?: string | null
                    footer_text?: string | null
                    terms_text?: string | null
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
                    invite_code?: string | null
                    allow_guest_join?: boolean
                    bank_name?: string | null
                    iban?: string | null
                    bic?: string | null
                    tax_id?: string | null
                    ust_id?: string | null
                    footer_text?: string | null
                    terms_text?: string | null
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
                    invite_code?: string | null
                    allow_guest_join?: boolean
                    bank_name?: string | null
                    iban?: string | null
                    bic?: string | null
                    tax_id?: string | null
                    ust_id?: string | null
                    footer_text?: string | null
                    terms_text?: string | null
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
                    color?: string
                    initials?: string
                    is_kiosk_mode?: boolean
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
                    color?: string
                    initials?: string
                    is_kiosk_mode?: boolean
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
                    color?: string
                    initials?: string
                    is_kiosk_mode?: boolean
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
                    internal_note: string | null
                    customer_note: string | null
                    checklist: Json
                    assignments: Json
                    history: Json
                    leasing_provider: string | null
                    leasing_code: string | null
                    contract_id: string | null
                    service_package: string | null
                    inspection_code: string | null
                    pickup_code: string | null
                    is_billed: boolean
                    archived: boolean
                    trash_date: string | null
                }
                Insert: {
                    id?: string
                    workshop_id: string
                    order_number: string
                    customer_name: string
                    customer_email?: string | null
                    customer_phone?: string | null
                    customer_address?: string | null
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
                    internal_note?: string | null
                    customer_note?: string | null
                    checklist?: Json
                    assignments?: Json
                    history?: Json
                    leasing_provider?: string | null
                    leasing_code?: string | null
                    contract_id?: string | null
                    service_package?: string | null
                    inspection_code?: string | null
                    pickup_code?: string | null
                    is_billed?: boolean
                    archived?: boolean
                    trash_date?: string | null
                }
                Update: {
                    id?: string
                    workshop_id?: string
                    order_number?: string
                    customer_name?: string
                    customer_email?: string | null
                    customer_phone?: string | null
                    customer_address?: string | null
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
                    internal_note?: string | null
                    customer_note?: string | null
                    checklist?: Json
                    assignments?: Json
                    history?: Json
                    leasing_provider?: string | null
                    leasing_code?: string | null
                    contract_id?: string | null
                    service_package?: string | null
                    inspection_code?: string | null
                    pickup_code?: string | null
                    is_billed?: boolean
                    archived?: boolean
                    trash_date?: string | null
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
            intake_requests: {
                Row: {
                    id: string
                    workshop_id: string
                    customer_name: string
                    customer_email: string | null
                    customer_phone: string | null
                    customer_address: string | null
                    description: string | null
                    status: string
                    intake_type?: string
                    leasing_provider?: string | null
                    contract_id?: string | null
                    service_package?: string | null
                    inspection_code?: string | null
                    pickup_code?: string | null
                    private_email?: string | null
                    bike_model?: string | null
                    bike_type?: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    workshop_id: string
                    customer_name: string
                    customer_email?: string | null
                    customer_phone?: string | null
                    customer_address?: string | null
                    description?: string | null
                    status?: string
                    intake_type?: string
                    leasing_provider?: string | null
                    contract_id?: string | null
                    service_package?: string | null
                    inspection_code?: string | null
                    pickup_code?: string | null
                    private_email?: string | null
                    bike_model?: string | null
                    bike_type?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    workshop_id?: string
                    customer_name?: string
                    customer_email?: string | null
                    customer_phone?: string | null
                    customer_address?: string | null
                    description?: string | null
                    status?: string
                    intake_type?: string
                    leasing_provider?: string | null
                    contract_id?: string | null
                    service_package?: string | null
                    inspection_code?: string | null
                    pickup_code?: string | null
                    private_email?: string | null
                    bike_model?: string | null
                    bike_type?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
        }
        bike_builds: {
            Row: {
                id: string
                workshop_id: string
                created_at: string
                updated_at: string | null
                status: string
                brand: string
                model: string
                color: string
                frame_size: string
                internal_number: string
                battery_serial: string | null
                notes: string | null
                customer_name: string | null
                customer_email: string | null
                mechanic_name: string | null
                assigned_employee_id: string | null
                qc_mechanic_id: string | null
                assembly_progress: Json | null
                checklist_template: string | null
                control_data: Json | null
            }
            Insert: {
                id?: string
                workshop_id: string
                created_at?: string
                updated_at?: string | null
                status?: string
                brand: string
                model: string
                color: string
                frame_size: string
                internal_number: string
                battery_serial?: string | null
                notes?: string | null
                customer_name?: string | null
                customer_email?: string | null
                mechanic_name?: string | null
                assigned_employee_id?: string | null
                qc_mechanic_id?: string | null
                assembly_progress?: Json | null
                checklist_template?: string | null
                control_data?: Json | null
            }
            Update: {
                id?: string
                workshop_id?: string
                created_at?: string
                updated_at?: string | null
                status?: string
                brand?: string
                model?: string
                color?: string
                frame_size?: string
                internal_number?: string
                battery_serial?: string | null
                notes?: string | null
                customer_name?: string | null
                customer_email?: string | null
                mechanic_name?: string | null
                assigned_employee_id?: string | null
                qc_mechanic_id?: string | null
                assembly_progress?: Json | null
                checklist_template?: string | null
                control_data?: Json | null
            }
        }
    }
}


/**
 * Enhanced PDF Generator with Workshop Branding
 * Creates beautiful, professional PDFs with custom styling
 */

import { WorkshopDesignConfig } from '@/types/design'
import { designConfig } from './design-config'

export interface PDFOrderData {
  orderNumber: string
  customerName: string
  customerAddress?: string
  customerPhone?: string
  customerEmail?: string
  bikeModel: string
  bikeBrand?: string
  bikeColor?: string
  bikeSerial?: string
  status: string
  statusLabel: string
  dueDate?: string
  createdDate: string
  mechanic?: string
  qcMechanic?: string
  checklist?: Array<{
    text: string
    completed: boolean
    completedBy?: string | null
    completedAt?: string | null
  }>
  notes?: string
  totalPrice?: number
}

export interface PDFOptions {
  includeChecklist?: boolean
  includeNotes?: boolean
  includeBarcode?: boolean
  language?: 'de' | 'en'
}

/**
 * Generate HTML for PDF export
 */
export const generateOrderPDF = (
  orderData: PDFOrderData,
  options: PDFOptions = {}
): string => {
  const config = designConfig.getConfig()

  const {
    includeChecklist = true,
    includeNotes = true,
    includeBarcode = config.showBarcode ?? true,
    language = 'de',
  } = options

  const labels = {
    order: language === 'de' ? 'Auftrag' : 'Order',
    customer: language === 'de' ? 'Kunde' : 'Customer',
    bike: language === 'de' ? 'Fahrrad' : 'Bicycle',
    status: language === 'de' ? 'Status' : 'Status',
    dueDate: language === 'de' ? 'Fälligkeitsdatum' : 'Due Date',
    created: language === 'de' ? 'Erstellt am' : 'Created',
    mechanic: language === 'de' ? 'Mechaniker' : 'Mechanic',
    qc: language === 'de' ? 'Qualitätskontrolle' : 'Quality Control',
    checklist: language === 'de' ? 'Checkliste' : 'Checklist',
    notes: language === 'de' ? 'Notizen' : 'Notes',
    total: language === 'de' ? 'Gesamt' : 'Total',
  }

  const qrCodeUrl = includeBarcode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${orderData.orderNumber}`
    : null

  return `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${labels.order} ${orderData.orderNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', ${config.pdfFont || 'sans-serif'};
      font-size: 11px;
      line-height: 1.5;
      color: #1a1a1a;
      background: #f5f5f5;
    }

    .pdf-container {
      max-width: 210mm;
      margin: 0 auto;
      background: white;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }

    /* Header with gradient background */
    .pdf-header {
      background: linear-gradient(135deg, ${config.primaryColor}15 0%, ${config.secondaryColor}15 100%);
      padding: 30px 40px;
      border-bottom: 3px solid ${config.primaryColor};
      position: relative;
      overflow: hidden;
    }

    .pdf-header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -10%;
      width: 300px;
      height: 300px;
      background: ${config.primaryColor}10;
      border-radius: 50%;
      filter: blur(50px);
    }

    .header-content {
      position: relative;
      z-index: 1;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .order-title {
      font-size: 28px;
      font-weight: 700;
      color: ${config.primaryColor};
      margin-bottom: 5px;
      letter-spacing: -0.5px;
    }

    .order-number {
      font-size: 14px;
      color: #666;
      font-weight: 500;
    }

    .company-logo {
      max-width: ${config.logoWidth || 150}px;
      max-height: 60px;
      object-fit: contain;
    }

    /* Status badge */
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      background: ${config.primaryColor}15;
      color: ${config.primaryColor};
      border: 1px solid ${config.primaryColor}30;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 15px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Content sections */
    .pdf-content {
      padding: 40px;
    }

    .section {
      margin-bottom: 30px;
    }

    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: ${config.primaryColor};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid ${config.primaryColor}20;
    }

    /* Grid layout for info */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px 30px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
    }

    .info-label {
      font-size: 9px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }

    .info-value {
      font-size: 12px;
      font-weight: 500;
      color: #1a1a1a;
    }

    /* Customer and bike cards */
    .card {
      background: #fafafa;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 15px;
    }

    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: ${config.primaryColor};
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card-content {
      font-size: 12px;
      line-height: 1.7;
    }

    /* Checklist */
    .checklist {
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      overflow: hidden;
    }

    .checklist-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 15px;
      border-bottom: 1px solid #e5e5e5;
      background: white;
    }

    .checklist-item:last-child {
      border-bottom: none;
    }

    .checklist-item.completed {
      background: #f8fdf8;
    }

    .checkbox {
      width: 18px;
      height: 18px;
      border: 2px solid #d1d5db;
      border-radius: 4px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .checklist-item.completed .checkbox {
      background: ${config.primaryColor};
      border-color: ${config.primaryColor};
    }

    .checklist-item.completed .checkbox::after {
      content: '✓';
      color: white;
      font-size: 12px;
      font-weight: 700;
    }

    .checklist-text {
      flex: 1;
      font-size: 12px;
      line-height: 1.6;
    }

    .checklist-item.completed .checklist-text {
      text-decoration: line-through;
      color: #888;
    }

    .checklist-meta {
      font-size: 9px;
      color: #888;
      margin-top: 3px;
    }

    /* Notes section */
    .notes {
      background: #fffbeb;
      border: 1px solid #fbbf24;
      border-left: 4px solid #fbbf24;
      border-radius: 6px;
      padding: 15px;
      font-size: 11px;
      line-height: 1.7;
      font-style: italic;
    }

    /* Footer */
    .pdf-footer {
      background: ${config.primaryColor}05;
      padding: 25px 40px;
      border-top: 1px solid ${config.primaryColor}15;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .company-info {
      font-size: 9px;
      color: #666;
      line-height: 1.6;
    }

    .qr-code {
      width: 80px;
      height: 80px;
      border: 1px solid ${config.primaryColor}30;
      border-radius: 8px;
      padding: 8px;
      background: white;
    }

    .qr-code img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    /* Stamp */
    .stamp {
      position: absolute;
      bottom: 120px;
      right: 40px;
      width: 120px;
      height: 120px;
      border: 3px solid ${config.primaryColor};
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transform: rotate(-15deg);
      opacity: 0.8;
    }

    .stamp-text {
      font-size: 14px;
      font-weight: 700;
      color: ${config.primaryColor};
      text-transform: uppercase;
      text-align: center;
    }

    .stamp-date {
      font-size: 8px;
      color: ${config.primaryColor};
      margin-top: 4px;
    }

    /* Print styles */
    @media print {
      body {
        background: white;
      }
      .pdf-container {
        box-shadow: none;
      }
    }

    @page {
      margin: 0;
      size: A4;
    }
  </style>
</head>
<body>
  <div class="pdf-container">
    <!-- Header -->
    <div class="pdf-header">
      <div class="header-content">
        <div>
          <h1 class="order-title">${labels.order}</h1>
          <div class="order-number">#${orderData.orderNumber}</div>
          <div class="status-badge">${orderData.statusLabel}</div>
        </div>
        ${config.logoUrl && config.showLogoInPDF ? `
          <img src="${config.logoUrl}" alt="Logo" class="company-logo" />
        ` : ''}
      </div>
    </div>

    <!-- Content -->
    <div class="pdf-content">
      <!-- Info Grid -->
      <div class="section">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">${labels.created}</span>
            <span class="info-value">${orderData.createdDate}</span>
          </div>
          ${orderData.dueDate ? `
            <div class="info-item">
              <span class="info-label">${labels.dueDate}</span>
              <span class="info-value">${orderData.dueDate}</span>
            </div>
          ` : ''}
          ${orderData.mechanic ? `
            <div class="info-item">
              <span class="info-label">${labels.mechanic}</span>
              <span class="info-value">${orderData.mechanic}</span>
            </div>
          ` : ''}
          ${orderData.qcMechanic ? `
            <div class="info-item">
              <span class="info-label">${labels.qc}</span>
              <span class="info-value">${orderData.qcMechanic}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Customer Card -->
      <div class="section">
        <div class="card">
          <div class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            ${labels.customer}
          </div>
          <div class="card-content">
            <strong>${orderData.customerName}</strong><br/>
            ${orderData.customerAddress || ''}${orderData.customerAddress && orderData.customerPhone ? '<br/>' : ''}
            ${orderData.customerPhone || ''}${orderData.customerPhone && orderData.customerEmail ? ' · ' : ''}${orderData.customerEmail || ''}
          </div>
        </div>
      </div>

      <!-- Bike Card -->
      <div class="section">
        <div class="card">
          <div class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="5.5" cy="17.5" r="3.5"></circle>
              <circle cx="18.5" cy="17.5" r="3.5"></circle>
              <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"></path>
            </svg>
            ${labels.bike}
          </div>
          <div class="card-content">
            <strong>${orderData.bikeModel}</strong><br/>
            ${orderData.bikeBrand || ''}${orderData.bikeBrand && orderData.bikeColor ? ' · ' : ''}${orderData.bikeColor || ''}
            ${orderData.bikeSerial ? `<br/><span style="font-size: 10px; color: #888;">Seriennummer: ${orderData.bikeSerial}</span>` : ''}
          </div>
        </div>
      </div>

      <!-- Checklist -->
      ${includeChecklist && orderData.checklist && orderData.checklist.length > 0 ? `
        <div class="section">
          <div class="section-title">${labels.checklist}</div>
          <div class="checklist">
            ${orderData.checklist.map(item => `
              <div class="checklist-item ${item.completed ? 'completed' : ''}">
                <div class="checkbox"></div>
                <div>
                  <div class="checklist-text">${item.text}</div>
                  ${item.completedBy ? `
                    <div class="checklist-meta">
                      ${item.completedBy} · ${item.completedAt ? new Date(item.completedAt).toLocaleDateString('de-DE') : ''}
                    </div>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Notes -->
      ${includeNotes && orderData.notes ? `
        <div class="section">
          <div class="section-title">${labels.notes}</div>
          <div class="notes">${orderData.notes}</div>
        </div>
      ` : ''}

      ${orderData.totalPrice ? `
        <div class="section" style="margin-top: 20px;">
          <div style="text-align: right;">
            <span style="font-size: 14px; color: #888;">${labels.total}:</span>
            <span style="font-size: 24px; font-weight: 700; color: ${config.primaryColor}; margin-left: 10px;">
              €${orderData.totalPrice.toFixed(2)}
            </span>
          </div>
        </div>
      ` : ''}
    </div>

    <!-- Footer -->
    <div class="pdf-footer">
      <div class="company-info">
        ${config.companyName || ''}${config.companyName && config.companyAddress ? '<br/>' : ''}
        ${config.companyAddress || ''}${config.companyAddress && config.companyPhone ? '<br/>' : ''}
        ${config.companyPhone || ''}${config.companyPhone && config.companyEmail ? ' · ' : ''}${config.companyEmail || ''}
        ${config.taxId ? `<br/><span style="font-size: 8px; color: #999;">${config.taxId}</span>` : ''}
      </div>
      ${qrCodeUrl ? `
        <div class="qr-code">
          <img src="${qrCodeUrl}" alt="QR Code" />
        </div>
      ` : ''}
    </div>

    ${config.showStamps ? `
      <div class="stamp">
        <div class="stamp-text">${orderData.statusLabel}</div>
        <div class="stamp-date">${new Date().toLocaleDateString('de-DE')}</div>
      </div>
    ` : ''}
  </div>
</body>
</html>
  `.trim()
}

/**
 * Download PDF by printing the HTML
 */
export const downloadOrderPDF = async (
  orderData: PDFOrderData,
  options?: PDFOptions
): Promise<void> => {
  const html = generateOrderPDF(orderData, options)

  // Create a new window for printing
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error('Could not open print window. Please allow popups.')
  }

  printWindow.document.write(html)
  printWindow.document.close()

  // Wait for content to load, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }
}

/**
 * Generate and download multiple orders as PDF
 */
export const downloadOrdersPDF = async (
  orders: PDFOrderData[],
  options?: PDFOptions
): Promise<void> => {
  for (const order of orders) {
    await downloadOrderPDF(order, options)
    // Small delay between downloads
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

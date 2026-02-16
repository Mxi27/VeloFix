import React from "react";

/**
 * ServiceReport – PDF-optimiertes Service- & Inspektionsbericht Design
 *
 * Props erlauben dynamische Daten. Verwende mit einem PDF-Renderer
 * (z.B. @react-pdf/renderer, html2pdf, puppeteer print-to-PDF).
 */

export interface WorkItem {
    title: string;
    date: string;
    team: string;
    note?: string;
}

export interface ServiceReportProps {
    shopName?: string;
    orderNumber?: string;
    date?: string;
    customerName?: string;
    bikeName?: string;
    bikeType?: string;
    workItems?: WorkItem[];
    accentColor?: string;
}

export const ServiceReport = React.forwardRef<HTMLDivElement, ServiceReportProps>(({
    shopName = "Boxenstop Radsport",
    orderNumber = "AV-9766",
    date = "14. Februar 2026",
    customerName = "Alex Döß",
    bikeName = "Trek Rail 9.8",
    bikeType = "E-Bike",
    accentColor = "#1B7A4A",
    workItems = [
        { title: "Fahrrad waschen", date: "14.2.2026", team: "VeloFix Team" },
        { title: "Laufräder zentrieren", date: "14.2.2026", team: "VeloFix Team" },
        { title: "Alle Schrauben festziehen", date: "14.2.2026", team: "VeloFix Team" },
        { title: "Schaltung einstellen", date: "14.2.2026", team: "VeloFix Team" },
        { title: "Armaturen einstellen", date: "14.2.2026", team: "VeloFix Team", note: "Bremshebel ist defekt" },
        { title: "Bremse", date: "14.2.2026", team: "VeloFix Team" },
    ],
}, ref) => {
    const styles = {
        page: {
            width: "210mm",
            minHeight: "297mm",
            margin: "0 auto",
            background: "#FFFFFF",
            fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
            color: "#1A1A1A",
            display: "flex" as const,
            flexDirection: "column" as const,
            position: "relative" as const,
            overflow: "hidden" as const,
            boxSizing: "border-box" as const,
            paddingBottom: "50px", // Ensure content doesn't hit bottom edge too hard
        },
        accentBar: {
            width: "100%",
            height: "5px",
            background: accentColor,
        },
        header: {
            padding: "44px 56px 0",
            display: "flex" as const,
            justifyContent: "space-between" as const,
            alignItems: "flex-start" as const,
        },
        brand: {
            fontSize: "28px",
            fontWeight: 800 as const,
            letterSpacing: "-0.5px",
            color: "#0A0A0A",
        },
        shopName: {
            fontSize: "10px",
            fontWeight: 600 as const,
            letterSpacing: "2.5px",
            textTransform: "uppercase" as const,
            color: "#999999",
            marginBottom: "4px",
        },
        orderBadge: {
            background: `${accentColor}0D`,
            border: `1px solid ${accentColor}25`,
            borderRadius: "8px",
            padding: "8px 16px",
            textAlign: "right" as const,
        },
        orderLabel: {
            fontSize: "9px",
            fontWeight: 600 as const,
            letterSpacing: "2px",
            textTransform: "uppercase" as const,
            color: "#999",
            marginBottom: "2px",
        },
        orderValue: {
            fontSize: "16px",
            fontWeight: 700 as const,
            color: accentColor,
            letterSpacing: "0.5px",
        },
        docTitle: {
            padding: "24px 56px 0",
        },
        docTitleText: {
            fontSize: "10px",
            fontWeight: 600 as const,
            letterSpacing: "3px",
            textTransform: "uppercase" as const,
            color: "#AAAAAA",
        },
        metaGrid: {
            display: "grid" as const,
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "0",
            margin: "28px 56px 0",
            borderRadius: "10px",
            border: "1px solid #F0F0F0",
            overflow: "hidden" as const,
        },
        metaCell: {
            padding: "18px 22px",
            borderRight: "1px solid #F0F0F0",
        },
        metaCellLast: {
            padding: "18px 22px",
            borderRight: "none",
        },
        metaLabel: {
            fontSize: "9px",
            fontWeight: 600 as const,
            letterSpacing: "1.8px",
            textTransform: "uppercase" as const,
            color: "#AAAAAA",
            marginBottom: "6px",
        },
        metaValue: {
            fontSize: "14px",
            fontWeight: 600 as const,
            color: "#1A1A1A",
        },
        bikeBadge: {
            display: "inline-block" as const,
            background: `${accentColor}12`,
            color: accentColor,
            fontSize: "10px",
            fontWeight: 700 as const,
            letterSpacing: "1px",
            textTransform: "uppercase" as const,
            padding: "3px 8px",
            borderRadius: "4px",
            marginLeft: "8px",
        },
        sectionHeader: {
            padding: "36px 56px 16px",
            display: "flex" as const,
            alignItems: "center" as const,
            gap: "12px",
        },
        sectionTitle: {
            fontSize: "11px",
            fontWeight: 700 as const,
            letterSpacing: "2.5px",
            textTransform: "uppercase" as const,
            color: "#1A1A1A",
        },
        sectionLine: {
            flex: 1,
            height: "1px",
            background: "#EEEEEE",
        },
        sectionCount: {
            fontSize: "11px",
            fontWeight: 600 as const,
            color: "#BBBBBB",
        },
        workList: {
            padding: "0 56px",
            display: "flex" as const,
            flexDirection: "column" as const,
            gap: "0",
        },
        workItem: {
            display: "flex" as const,
            alignItems: "flex-start" as const,
            padding: "16px 0",
            borderBottom: "1px solid #F5F5F5",
            gap: "16px",
        },
        workItemLast: {
            display: "flex" as const,
            alignItems: "flex-start" as const,
            padding: "16px 0",
            borderBottom: "none",
            gap: "16px",
        },
        checkCircle: {
            width: "22px",
            height: "22px",
            minWidth: "22px",
            borderRadius: "50%",
            background: accentColor,
            display: "flex" as const,
            alignItems: "center" as const,
            justifyContent: "center" as const,
            marginTop: "1px",
        },
        checkMark: {
            color: "#FFFFFF",
            fontSize: "11px",
            fontWeight: 700 as const,
            lineHeight: 1,
        },
        workContent: {
            flex: 1,
        },
        workTitle: {
            fontSize: "14px",
            fontWeight: 600 as const,
            color: "#1A1A1A",
            marginBottom: "4px",
        },
        workMeta: {
            fontSize: "11px",
            color: "#AAAAAA",
            fontWeight: 400 as const,
        },
        workNote: {
            marginTop: "6px",
            fontSize: "12px",
            color: "#C0792A",
            fontWeight: 500 as const,
            background: "#FFF8F0",
            border: "1px solid #FFECD6",
            borderRadius: "6px",
            padding: "6px 10px",
            display: "inline-block" as const,
        },
        footer: {
            marginTop: "auto",
            padding: "28px 56px 32px",
            borderTop: "1px solid #F0F0F0",
            display: "flex" as const,
            justifyContent: "space-between" as const,
            alignItems: "center" as const,
        },
        footerBrand: {
            fontSize: "9.5px",
            fontWeight: 600 as const,
            letterSpacing: "2px",
            textTransform: "uppercase" as const,
            color: "#CCCCCC",
        },
        footerDate: {
            fontSize: "9.5px",
            color: "#CCCCCC",
        },
    };

    return (
        <div ref={ref} style={styles.page}>
            {/* Accent Bar */}
            <div style={styles.accentBar} />

            {/* Header */}
            <div style={styles.header}>
                <div>
                    <div style={styles.shopName}>{shopName}</div>
                    <div style={styles.brand}>VeloFix</div>
                </div>
                <div style={styles.orderBadge}>
                    <div style={styles.orderLabel}>Auftrag</div>
                    <div style={styles.orderValue}>{orderNumber}</div>
                </div>
            </div>

            {/* Document Title */}
            <div style={styles.docTitle}>
                <span style={styles.docTitleText}>Service- und Inspektionsbericht</span>
            </div>

            {/* Meta Grid */}
            <div style={styles.metaGrid}>
                <div style={styles.metaCell}>
                    <div style={styles.metaLabel}>Datum</div>
                    <div style={styles.metaValue}>{date}</div>
                </div>
                <div style={styles.metaCell}>
                    <div style={styles.metaLabel}>Kunde</div>
                    <div style={styles.metaValue}>{customerName}</div>
                </div>
                <div style={styles.metaCellLast}>
                    <div style={styles.metaLabel}>Fahrrad</div>
                    <div style={styles.metaValue}>
                        {bikeName}
                        <span style={styles.bikeBadge}>{bikeType}</span>
                    </div>
                </div>
            </div>

            {/* Section Header */}
            <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>Durchgeführte Arbeiten</span>
                <div style={styles.sectionLine} />
                <span style={styles.sectionCount}>{workItems.length} Positionen</span>
            </div>

            {/* Work Items */}
            <div style={styles.workList}>
                {workItems.map((item, i) => (
                    <div
                        key={i}
                        style={i === workItems.length - 1 ? styles.workItemLast : styles.workItem}
                    >
                        <div style={styles.checkCircle}>
                            <span style={styles.checkMark}>✓</span>
                        </div>
                        <div style={styles.workContent}>
                            <div style={styles.workTitle}>{item.title}</div>
                            <div style={styles.workMeta}>
                                {item.date} · {item.team}
                            </div>
                            {item.note && <div style={styles.workNote}>⚠ {item.note}</div>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div style={styles.footer}>
                <span style={styles.footerBrand}>Generiert mit VeloFix Software</span>
                <span style={styles.footerDate}>{date}</span>
            </div>
        </div>
    );
});

ServiceReport.displayName = "ServiceReport";

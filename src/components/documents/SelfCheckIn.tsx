import React from "react";

export interface SelfCheckInProps {
    shopName?: string;
    qrCodeSrc?: string;
    accentColor?: string;
}

export const SelfCheckIn = React.forwardRef<HTMLDivElement, SelfCheckInProps>(
    (
        {
            shopName = "Boxenstop Radsport",
            qrCodeSrc = "/qr-code.png",
            accentColor = "#1B7A4A",
        },
        ref
    ) => {
        return (
            <div
                ref={ref}
                id="self-check-in-print-root"
                style={{
                    width: "210mm",
                    minHeight: "297mm",
                    margin: "0 auto",
                    background: "#FFFFFF",
                    fontFamily:
                        "'DM Sans', 'Helvetica Neue', sans-serif",
                    color: "#1A1A1A",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "0",
                    boxSizing: "border-box",
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                <style>
                    {`
                    #self-check-in-print-root * {
                        border-color: transparent;
                        box-shadow: none;
                    }
                    `}
                </style>

                {/* ── Accent Bar ── */}
                <div
                    style={{
                        width: "100%",
                        height: "5px",
                        background: accentColor,
                    }}
                />

                {/* ── Header ── */}
                <div
                    style={{
                        width: "100%",
                        padding: "40px 48px 0",
                        boxSizing: "border-box",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                    }}
                >
                    <span
                        style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            letterSpacing: "2.5px",
                            textTransform: "uppercase",
                            color: "#999999",
                            marginBottom: "4px",
                        }}
                    >
                        {shopName}
                    </span>

                    <span
                        style={{
                            fontSize: "26px",
                            fontWeight: 800,
                            letterSpacing: "-0.5px",
                            color: "#0A0A0A",
                            marginBottom: "20px",
                        }}
                    >
                        VeloFix
                    </span>

                    <span
                        style={{
                            fontSize: "9.5px",
                            fontWeight: 600,
                            letterSpacing: "3px",
                            textTransform: "uppercase",
                            color: "#AAAAAA",
                            marginBottom: "28px",
                        }}
                    >
                        Self Check-In
                    </span>

                    <p
                        style={{
                            fontSize: "13px",
                            fontWeight: 400,
                            color: "#777777",
                            margin: 0,
                            lineHeight: 1.5,
                        }}
                    >
                        Starten Sie Ihre Reparatur-Annahme – schnell &amp;
                        digital.
                    </p>
                </div>

                {/* ── QR Code Section ── */}
                <div
                    style={{
                        marginTop: "36px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                    }}
                >
                    <div
                        style={{
                            width: "220px",
                            height: "220px",
                            borderRadius: "10px",
                            background: "#FFFFFF",
                            boxShadow:
                                "0 2px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "18px",
                            boxSizing: "border-box",
                        }}
                    >
                        <img
                            src={qrCodeSrc}
                            alt="QR Code für Self Check-In"
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                            }}
                        />
                    </div>

                    <div
                        style={{
                            marginTop: "18px",
                            background: accentColor,
                            color: "#FFFFFF",
                            fontSize: "12px",
                            fontWeight: 700,
                            letterSpacing: "1.8px",
                            textTransform: "uppercase",
                            padding: "11px 34px",
                            borderRadius: "100px",
                        }}
                    >
                        Jetzt scannen
                    </div>
                </div>

                {/* ── Divider ── */}
                <div
                    style={{
                        width: "56px",
                        height: "1px",
                        background: "#E5E5E5",
                        margin: "36px 0",
                    }}
                />

                {/* ── Steps Section ── */}
                <div
                    style={{
                        width: "100%",
                        padding: "0 48px",
                        boxSizing: "border-box",
                    }}
                >
                    {/* Section Header */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            marginBottom: "20px",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                letterSpacing: "2.5px",
                                textTransform: "uppercase",
                                color: "#1A1A1A",
                                whiteSpace: "nowrap",
                            }}
                        >
                            So funktioniert's
                        </span>
                        <div
                            style={{
                                flex: 1,
                                height: "1px",
                                background: "#EEEEEE",
                            }}
                        />
                        <span
                            style={{
                                fontSize: "10px",
                                fontWeight: 600,
                                color: "#BBBBBB",
                                whiteSpace: "nowrap",
                            }}
                        >
                            3 Schritte
                        </span>
                    </div>

                    {/* Steps List */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {[
                            {
                                num: "1",
                                text: "QR-Code mit Kamera scannen",
                            },
                            {
                                num: "2",
                                text: "Details zum Fahrrad eingeben",
                            },
                            {
                                num: "3",
                                text: "Auftrag unverbindlich absenden",
                            },
                        ].map((step, i) => (
                            <div
                                key={step.num}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "14px",
                                    padding: "14px 0",
                                    borderBottom:
                                        i < 2
                                            ? "1px solid #F5F5F5"
                                            : "none",
                                }}
                            >
                                <div
                                    style={{
                                        width: "34px",
                                        height: "34px",
                                        minWidth: "34px",
                                        borderRadius: "50%",
                                        background: `${accentColor}12`,
                                        border: `1.5px solid ${accentColor}30`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "13px",
                                        fontWeight: 700,
                                        color: accentColor,
                                    }}
                                >
                                    {step.num}
                                </div>

                                <span
                                    style={{
                                        fontSize: "13px",
                                        fontWeight: 600,
                                        color: "#2A2A2A",
                                        lineHeight: 1.4,
                                    }}
                                >
                                    {step.text}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Spacer ── */}
                <div style={{ flex: 1, minHeight: "40px" }} />

                {/* ── Footer ── */}
                <div
                    style={{
                        width: "100%",
                        padding: "24px 48px 28px",
                        boxSizing: "border-box",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderTop: "1px solid #F0F0F0",
                    }}
                >
                    <span
                        style={{
                            fontSize: "9px",
                            fontWeight: 600,
                            letterSpacing: "2px",
                            textTransform: "uppercase",
                            color: "#CCCCCC",
                        }}
                    >
                        Powered by VeloFix Software
                    </span>
                    <span
                        style={{
                            fontSize: "9px",
                            color: "#CCCCCC",
                        }}
                    >
                        Digital · Schnell · Sicher
                    </span>
                </div>
            </div>
        );
    }
);

SelfCheckIn.displayName = "SelfCheckIn";
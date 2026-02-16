import React from "react";

export interface SelfCheckInProps {
    shopName?: string;
    shopAddress?: string;
    shopPhone?: string;
    qrCodeSrc?: string;
    accentColor?: string;
}

export const SelfCheckIn = React.forwardRef<HTMLDivElement, SelfCheckInProps>(
    (
        {
            shopName = "Boxenstop Radsport",
            shopAddress,
            shopPhone,
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
                    height: "297mm",
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
                        height: "8px",
                        background: `linear-gradient(90deg, ${accentColor}, ${accentColor}CC)`,
                    }}
                />

                {/* ── Top Spacer ── */}
                <div style={{ flex: 1, minHeight: "40px" }} />

                {/* ── Header ── */}
                <div
                    style={{
                        width: "100%",
                        padding: "0 56px",
                        boxSizing: "border-box",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                    }}
                >
                    <span
                        style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            letterSpacing: "3px",
                            textTransform: "uppercase",
                            color: "#AAAAAA",
                            marginBottom: "6px",
                        }}
                    >
                        {shopName}
                    </span>

                    <span
                        style={{
                            fontSize: "32px",
                            fontWeight: 800,
                            letterSpacing: "-0.5px",
                            color: "#0A0A0A",
                            marginBottom: "8px",
                        }}
                    >
                        Self Check-In
                    </span>

                    <p
                        style={{
                            fontSize: "14px",
                            fontWeight: 400,
                            color: "#888888",
                            margin: 0,
                            lineHeight: 1.6,
                            maxWidth: "360px",
                        }}
                    >
                        Starten Sie Ihre Reparatur-Annahme –<br />
                        schnell &amp; digital.
                    </p>
                </div>

                {/* ── QR Code Section ── */}
                <div
                    style={{
                        marginTop: "48px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                    }}
                >
                    <div
                        style={{
                            width: "260px",
                            height: "260px",
                            borderRadius: "16px",
                            background: "#FFFFFF",
                            boxShadow:
                                "0 4px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "22px",
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
                            marginTop: "22px",
                            background: accentColor,
                            color: "#FFFFFF",
                            fontSize: "13px",
                            fontWeight: 700,
                            letterSpacing: "2px",
                            textTransform: "uppercase",
                            padding: "13px 40px",
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
                        background: "#E0E0E0",
                        margin: "44px 0",
                    }}
                />

                {/* ── Steps Section ── */}
                <div
                    style={{
                        width: "100%",
                        padding: "0 56px",
                        boxSizing: "border-box",
                        maxWidth: "440px",
                    }}
                >
                    {/* Section Header */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            marginBottom: "22px",
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
                                    gap: "16px",
                                    padding: "16px 0",
                                    borderBottom:
                                        i < 2
                                            ? "1px solid #F3F3F3"
                                            : "none",
                                }}
                            >
                                <div
                                    style={{
                                        width: "38px",
                                        height: "38px",
                                        minWidth: "38px",
                                        borderRadius: "50%",
                                        background: `${accentColor}14`,
                                        border: `1.5px solid ${accentColor}30`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "14px",
                                        fontWeight: 700,
                                        color: accentColor,
                                    }}
                                >
                                    {step.num}
                                </div>

                                <span
                                    style={{
                                        fontSize: "14px",
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

                {/* ── Bottom Spacer ── */}
                <div style={{ flex: 1, minHeight: "40px" }} />

                {/* ── Footer ── */}
                <div
                    style={{
                        width: "100%",
                        padding: "24px 56px 28px",
                        boxSizing: "border-box",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-end",
                        borderTop: "1px solid #F0F0F0",
                    }}
                >
                    <div>
                        {(shopAddress || shopPhone) && (
                            <p
                                style={{
                                    fontSize: "9px",
                                    color: "#BBBBBB",
                                    margin: "0 0 4px 0",
                                    lineHeight: 1.5,
                                }}
                            >
                                {shopName}
                                {shopAddress ? ` · ${shopAddress}` : ""}
                                {shopPhone ? ` · ${shopPhone}` : ""}
                            </p>
                        )}
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
                    </div>
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
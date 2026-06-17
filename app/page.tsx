"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { colors } from "@/colors";
import { useLanguage } from "@/hooks/use-language";
import images from "../constants/images";
import { useAuthStore } from "@/store/auth.store";
import { getDeviceMetrics } from "@/utils/responsive";

const { width, height, isXs: isSmallDevice } = getDeviceMetrics();

const responsiveWidth = (w: number) => (width * w) / 100;
const responsiveHeight = (h: number) => (height * h) / 100;

const font = {
  loader: isSmallDevice ? 13 : 15,
  loaderSub: isSmallDevice ? 11 : 13,
  brand: isSmallDevice ? 21 : 25,
  brandSub: isSmallDevice ? 18 : 21,
  tagline: isSmallDevice ? 12 : 14,
  chip: isSmallDevice ? 11 : 12,
  button: isSmallDevice ? 14 : 16,
  footer: isSmallDevice ? 11 : 13,
};

export default function StartScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isLoading, isAuthenticated, loadSession } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      await loadSession();
    };
    initAuth();
  }, [loadSession]);

  useEffect(() => {
    // Redirect to tabs if authenticated
    if (isAuthenticated && !isLoading) {
      router.push("/(tabs)");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div
        style={{
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primary} 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "20px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              border: `4px solid ${colors.primaryLight}`,
              borderTop: `4px solid transparent`,
              animation: "spin 1s linear infinite",
              margin: "0 auto",
            }}
          />
          <div
            style={{
              marginTop: isSmallDevice ? 14 : 20,
              fontSize: font.loader,
              color: colors.white,
              fontWeight: "600",
              letterSpacing: 0,
            }}
          >
            {t("loading")}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: font.loaderSub,
              color: colors.primaryFaint,
            }}
          >
            San Raj Metal Art
          </div>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primary} 50%, ${colors.gray600} 100%)`,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        position: "relative",
      }}
    >
      {/* Background decoration circle */}
      <div
        style={{
          position: "absolute",
          bottom: -height * 0.15,
          left: -width * 0.25,
          width: width * 0.5,
          height: width * 0.5,
          borderRadius: width * 0.25,
          backgroundColor: colors.primaryLight + "18",
          pointerEvents: "none",
        }}
      />

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "20px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Header section */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: font.brand,
              fontWeight: "800",
              color: colors.white,
              marginTop: responsiveHeight(isSmallDevice ? 5 : 8),
              letterSpacing: "1px",
            }}
          >
            San Raj
          </div>
          <div
            style={{
              fontSize: font.brandSub,
              fontWeight: "800",
              color: "#FCD34D",
              marginTop: isSmallDevice ? -2 : -5,
              letterSpacing: "1px",
            }}
          >
            Metal Art
          </div>

          <div
            style={{
              fontSize: font.tagline,
              fontWeight: "500",
              color: colors.primaryFaint,
              marginTop: isSmallDevice ? 8 : 12,
              paddingLeft: isSmallDevice ? 24 : 40,
              paddingRight: isSmallDevice ? 24 : 40,
              lineHeight: 1.4,
            }}
          >
            {t("premium_brass_metal_statues")}
          </div>

          {/* Decorative divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: isSmallDevice ? 8 : 10,
              marginTop: isSmallDevice ? 14 : 20,
            }}
          >
            <div
              style={{
                width: isSmallDevice ? 28 : 40,
                height: 2,
                backgroundColor: colors.secondary,
                opacity: 0.5,
              }}
            />
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.secondary,
              }}
            />
            <div
              style={{
                width: isSmallDevice ? 28 : 40,
                height: 2,
                backgroundColor: colors.secondary,
                opacity: 0.5,
              }}
            />
          </div>
        </div>

        {/* Logo and features section */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: isSmallDevice ? 12 : 20,
              filter: `drop-shadow(0 0 30px ${colors.primaryLight}4d)`,
            }}
          >
            <img
              src={String(images.logo)}
              alt="San Raj Metal Art"
              style={{
                width: `${responsiveWidth(isSmallDevice ? 58 : 70)}px`,
                height: `${responsiveHeight(isSmallDevice ? 18 : 25)}px`,
                maxHeight: isSmallDevice ? 170 : 250,
                objectFit: "contain",
              }}
            />
          </div>

          {/* Feature chips */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: isSmallDevice ? 8 : 15,
              paddingLeft: isSmallDevice ? 12 : 20,
              paddingRight: isSmallDevice ? 12 : 20,
              marginTop: isSmallDevice ? 6 : 10,
            }}
          >
            {[
              { icon: "🪞", text: t("handcrafted_brass") },
              { icon: "🎨", text: t("premium_quality") },
            ].map((feature, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: colors.white + "12",
                  paddingLeft: isSmallDevice ? 10 : 16,
                  paddingRight: isSmallDevice ? 10 : 16,
                  paddingTop: isSmallDevice ? 6 : 8,
                  paddingBottom: isSmallDevice ? 6 : 8,
                  borderRadius: 50,
                  display: "flex",
                  alignItems: "center",
                  gap: isSmallDevice ? 5 : 8,
                }}
              >
                <span style={{ fontSize: isSmallDevice ? 13 : 16 }}>
                  {feature.icon}
                </span>
                <span
                  style={{
                    color: colors.primaryFaint,
                    fontSize: font.chip,
                    fontWeight: "500",
                  }}
                >
                  {feature.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA section */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            paddingLeft: responsiveWidth(6),
            paddingRight: responsiveWidth(6),
            marginBottom: responsiveHeight(isSmallDevice ? 3 : 5),
            marginTop: responsiveHeight(isSmallDevice ? 2 : 3),
          }}
        >
          {/* Login button */}
          <button
            onClick={() => router.push("/login")}
            style={{
              background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.secondary} 100%)`,
              border: "none",
              padding: `${isSmallDevice ? 11 : responsiveHeight(2)}px 20px`,
              borderRadius: 50,
              color: colors.primary,
              fontSize: font.button,
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: `0 4px 8px ${colors.secondary}4d`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(0.98)";
              e.currentTarget.style.boxShadow = `0 2px 4px ${colors.secondary}4d`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = `0 4px 8px ${colors.secondary}4d`;
            }}
          >
            {t("login")}
          </button>

          {/* Info section */}
          <div
            style={{
              marginTop: isSmallDevice ? 18 : 30,
              paddingTop: isSmallDevice ? 14 : 20,
              borderTop: `1px solid ${colors.white}18`,
            }}
          >
            <div
              style={{
                color: "#FCD34D",
                textAlign: "center",
                fontSize: font.footer,
                fontWeight: "600",
                marginBottom: isSmallDevice ? 5 : 8,
              }}
            >
              {t("our_collection")}
            </div>
            <div
              style={{
                textAlign: "center",
                color: colors.primaryFaint,
                fontSize: font.footer,
                lineHeight: isSmallDevice ? 16 : 20,
              }}
            >
              {t("collection_items")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect } from "react";
import {
  Redirect,
  useRouter } from "next/navigation";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  webStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
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

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-primary">
        <LinearGradient
          colors={[colors.primary, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: "absolute", inset: 0 }}
        />
        <div className="flex-1 justify-center items-center">
          <div className="items-center">
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <span
              style={webStyle({
                marginTop: isSmallDevice ? 14 : 20,
                fontSize: font.loader,
                color: colors.white,
                fontWeight: "600",
                letterSpacing: 0,
              })}
            >
              {t("loading")}
            </span>
            <span
              style={webStyle({
                marginTop: 8,
                fontSize: font.loaderSub,
                color: colors.primaryFaint,
              })}
            >
              San Raj Metal Art
            </span>
          </div>
        </div>
      </SafeAreaView>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaView className="flex-1">
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primary}
        translucent={false}
      />
      <LinearGradient
        colors={[colors.primary, colors.primary, colors.gray600]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
      />

      <div
        style={webStyle({
          position: "absolute",
          bottom: -height * 0.15,
          left: -width * 0.25,
          width: width * 0.5,
          height: width * 0.5,
          borderRadius: width * 0.25,
          backgroundColor: colors.primaryLight + "18",
        })}
      />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
        }}
        showsVerticalScrollIndicator={false}
      >
        <div
          style={webStyle({
            marginTop: responsiveHeight(isSmallDevice ? 5 : 8),
            alignItems: "center",
          })}
        >
          <span
            style={webStyle({
              fontSize: font.brand,
              fontWeight: "800",
              color: colors.white,
              textAlign: "center",
              letterSpacing: 0,
            })}
          >
            San Raj
          </span>
          <span
            className="text-yellow-300"
            style={webStyle({
              fontSize: font.brandSub,
              fontWeight: "800",
              textAlign: "center",
              letterSpacing: 0,
              marginTop: isSmallDevice ? -2 : -5,
            })}
          >
            Metal Art
          </span>

          <span
            style={webStyle({
              fontSize: font.tagline,
              fontWeight: "500",
              color: colors.primaryFaint,
              textAlign: "center",
              marginTop: isSmallDevice ? 8 : 12,
              paddingHorizontal: isSmallDevice ? 24 : 40,
              letterSpacing: 0,
            })}
          >
            {t("premium_brass_metal_statues")}
          </span>

          <div
            style={webStyle({
              flexDirection: "row",
              alignItems: "center",
              marginTop: isSmallDevice ? 14 : 20,
              gap: isSmallDevice ? 8 : 10,
            })}
          >
            <div
              style={webStyle({
                width: isSmallDevice ? 28 : 40,
                height: 2,
                backgroundColor: colors.secondary,
                opacity: 0.5,
              })}
            />
            <div
              style={webStyle({
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.secondary,
              })}
            />
            <div
              style={webStyle({
                width: isSmallDevice ? 28 : 40,
                height: 2,
                backgroundColor: colors.secondary,
                opacity: 0.5,
              })}
            />
          </div>
        </div>

        <div
          style={webStyle({
            marginTop: responsiveHeight(isSmallDevice ? 3 : 5),
            alignItems: "center",
          })}
        >
          <div
            style={webStyle({
              alignItems: "center",
              justifyContent: "center",
              marginBottom: isSmallDevice ? 12 : 20,
            })}
          >
            <div
              style={webStyle({
                shadowColor: colors.primaryLight,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 30,
                elevation: 10,
              })}
            >
              <Image
                source={images.logo}
                resizeMode="contain"
                style={{
                  width: responsiveWidth(isSmallDevice ? 58 : 70),
                  height: responsiveHeight(isSmallDevice ? 18 : 25),
                  maxHeight: isSmallDevice ? 170 : 250,
                }}
              />
            </div>
          </div>

          <div
            style={webStyle({
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: isSmallDevice ? 8 : 15,
              paddingHorizontal: isSmallDevice ? 12 : 20,
              marginTop: isSmallDevice ? 6 : 10,
            })}
          >
            {[
              { icon: "🪞", text: t("handcrafted_brass") },
              { icon: "🎨", text: t("premium_quality") },
            ].map((feature, idx) => (
              <div
                key={idx}
                style={webStyle({
                  backgroundColor: colors.white + "12",
                  paddingHorizontal: isSmallDevice ? 10 : 16,
                  paddingVertical: isSmallDevice ? 6 : 8,
                  borderRadius: 50,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: isSmallDevice ? 5 : 8,
                })}
              >
                <span style={webStyle({ fontSize: isSmallDevice ? 13 : 16 })}>
                  {feature.icon}
                </span>
                <span
                  style={webStyle({
                    color: colors.primaryFaint,
                    fontSize: font.chip,
                    fontWeight: "500",
                  })}
                >
                  {feature.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="flex flex-col gap-4 justify-between"
          style={webStyle({
            paddingHorizontal: responsiveWidth(6),
            marginBottom: responsiveHeight(isSmallDevice ? 3 : 5),
            marginTop: responsiveHeight(isSmallDevice ? 2 : 3),
          })}
        >
          <Pressable
            onPress={() => router.push("/login")}
            style={({ pressed }) => ({
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <LinearGradient
              colors={[colors.secondary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingVertical: isSmallDevice ? 11 : responsiveHeight(2),
                borderRadius: 50,
                shadowColor: colors.secondary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              <span
                style={webStyle({
                  color: colors.primary,
                  textAlign: "center",
                  fontSize: font.button,
                  fontWeight: "700",
                  letterSpacing: 0,
                })}
              >
                {t("login")}
              </span>
            </LinearGradient>
          </Pressable>

          <div
            style={webStyle({
              marginTop: isSmallDevice ? 18 : 30,
              paddingTop: isSmallDevice ? 14 : 20,
              borderTopWidth: 1,
              borderTopColor: colors.white + "18",
            })}
          >
            <span
              className="text-yellow-300"
              style={webStyle({
                textAlign: "center",

                fontSize: font.footer,
                fontWeight: "600",
                marginBottom: isSmallDevice ? 5 : 8,
              })}
            >
              {t("our_collection")}
            </span>
            <span
              style={webStyle({
                textAlign: "center",
                color: colors.primaryFaint,
                fontSize: font.footer,
                lineHeight: isSmallDevice ? 16 : 20,
              })}
            >
              {t("collection_items")}
            </span>
          </div>
        </div>
      </ScrollView>
    </SafeAreaView>
  );
}

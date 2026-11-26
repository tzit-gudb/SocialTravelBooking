import React, { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import { colors } from "../../../theme/tokens";
import { useExploreData } from "../context/ExploreDataContext";
import ExploreHeroSearch, { ExploreStickyHeader } from "../components/ExploreHeroSearch";
import FeaturedDestinationsCollage from "../components/FeaturedDestinationsCollage";
import HolidayDealsSection from "../components/HolidayDealsSection";
import CategoryShowcaseSection from "../components/CategoryShowcaseSection";
import ThreadsMasonryFeed from "../components/ThreadsMasonryFeed";
import AiPlannerBanner from "../components/AiPlannerBanner";
import WhyChooseUsSection from "../components/WhyChooseUsSection";

/**
 * Màn hình Trang chủ & Tìm kiếm (Tab "Tìm kiếm")
 * - Phần Logo + Icon + Danh mục cố định phía trên
 * - Từ Form tìm kiếm trở xuống cuộn mượt, nền nối liền #0284C7 phía sau giúp kéo hết cỡ xuống không bị lộ khoảng trắng
 */
export default function ExploreHomeScreen({ navigation }) {
  const isFocused = useIsFocused();
  const { locations, services, featuredPosts, campaigns, isRefreshing, refreshExploreData } =
    useExploreData();
  const [activeCategory, setActiveCategory] = useState("accommodation");

  const handleSubmitSearch = (params) => {
    navigation.navigate("ServiceSearch", params);
  };

  const handleSelectLocation = (loc) => {
    navigation.navigate("ServiceSearch", {
      location_id: typeof loc.id === "number" ? loc.id : "",
      location_name: loc.name,
      q: typeof loc.id === "number" ? "" : loc.name,
    });
  };

  const handleSelectService = (svc) => {
    navigation.navigate("Detail", {
      serviceId: svc.id,
      tour: svc,
    });
  };

  const handleExploreCategory = (categoryId, presetQuery = "") => {
    navigation.navigate("ServiceSearch", {
      group: categoryId,
      q: presetQuery,
    });
  };

  return (
    <View style={styles.container}>
      {isFocused ? <StatusBar style="light" /> : null}

      <ExploreStickyHeader activeCategory={activeCategory} onSelectCategory={setActiveCategory} />

      <View style={styles.scrollAreaWrapper}>
        {/* Nền xanh nối liền #0284C7 phía trên vùng cuộn để khi kéo hết cỡ xuống không lộ nền trắng */}
        <View style={styles.topOverscrollBackdrop} pointerEvents="none" />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshExploreData}
              tintColor="#FFFFFF"
              colors={[colors.brandPrimary]}
            />
          }
        >
          <ExploreHeroSearch
            activeCategory={activeCategory}
            locations={locations}
            onSubmitSearch={handleSubmitSearch}
          />

          <View style={styles.bodyContent}>
            <FeaturedDestinationsCollage
              locations={locations}
              onSelectLocation={handleSelectLocation}
              onPressSeeAll={() => navigation.navigate("AllLocations")}
            />

            <HolidayDealsSection
              campaigns={campaigns}
              services={services}
              onSelectService={handleSelectService}
              onOpenCampaigns={(campaignId) =>
                navigation.navigate("HolidayCampaigns", { campaignId })
              }
            />

            <CategoryShowcaseSection
              activeCategory={activeCategory}
              services={services}
              onSelectService={handleSelectService}
              onPressExploreCategory={handleExploreCategory}
            />

            <ThreadsMasonryFeed
              posts={featuredPosts}
              onPressPost={() => navigation.navigate("SocialApp")}
              onPressService={handleSelectService}
              onPressSeeAll={() => navigation.navigate("SocialApp")}
            />

            <AiPlannerBanner />

            <WhyChooseUsSection />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceBase,
  },
  scrollAreaWrapper: {
    flex: 1,
    position: "relative",
  },
  topOverscrollBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 260,
    backgroundColor: "#0284C7",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingBottom: 120,
  },
  bodyContent: {
    backgroundColor: colors.surfaceBase,
  },
});

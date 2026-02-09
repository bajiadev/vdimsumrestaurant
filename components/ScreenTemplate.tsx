import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ScreenTemplateProps = {
  title: string;
  children?: ReactNode;
  centered?: boolean;
};

export default function ScreenTemplate({
  title,
  children,
  centered = true,
}: ScreenTemplateProps) {
  const containerClassName = centered
    ? "flex-1 items-center justify-center bg-white px-6"
    : "flex-1 bg-white px-6";
  const contentClassName = centered ? "items-center gap-4" : "flex-1 gap-4";

  return (
    <SafeAreaView className={containerClassName}>
      <View className={contentClassName}>
        {title ? <Text className="text-2xl font-bold">{title}</Text> : null}
        {children}
      </View>
    </SafeAreaView>
  );
}

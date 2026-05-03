import { Linking, Text, TouchableOpacity, View } from "react-native";
import ScreenTemplate from "../components/ScreenTemplate";

export default function Help() {
  return (
    <ScreenTemplate title="Help">
      <View className="items-center mt-6">
        <TouchableOpacity onPress={() => Linking.openURL("https://www.vdimsum.co.uk")}>
          <Text className="text-blue-600 text-base underline">www.vdimsum.co.uk</Text>
        </TouchableOpacity>
      </View>
    </ScreenTemplate>
  );
}

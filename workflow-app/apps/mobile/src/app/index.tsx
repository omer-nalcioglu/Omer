import { Redirect } from "expo-router";
import { useApp } from "@/data/store";

export default function Index() {
  const mode = useApp(s => s.mode);
  return <Redirect href={mode === "none" ? "/login" : "/(tabs)"} />;
}

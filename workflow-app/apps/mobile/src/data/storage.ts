// Telefonda kalıcı depolama: SQLite tabanlı anahtar-değer deposu (çevrimdışı çalışır).
import Storage from "expo-sqlite/kv-store";
export default Storage as { getItem(k: string): Promise<string | null>; setItem(k: string, v: string): Promise<void>; removeItem(k: string): Promise<void> };

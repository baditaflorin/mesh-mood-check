import { useEffect, useState } from "react";
import { MeshShell } from "@baditaflorin/mesh-common";
import { Mood } from "./features/mood/Mood";
import { SettingsExtras } from "./features/settings/SettingsExtras";
import { appConfig } from "./shared/config";

const STORAGE = {
  room: `${appConfig.storagePrefix}:room`,
};

function readString(key: string, fallback: string): string {
  return localStorage.getItem(key) ?? fallback;
}

export function App() {
  const [roomId, setRoomId] = useState(() => readString(STORAGE.room, "default"));

  useEffect(() => {
    localStorage.setItem(STORAGE.room, roomId);
  }, [roomId]);

  return (
    <MeshShell
      config={appConfig}
      roomId={roomId}
      onRoomChange={setRoomId}
      settingsExtras={<SettingsExtras />}
    >
      <Mood roomId={roomId} />
    </MeshShell>
  );
}

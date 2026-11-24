import Echo from "laravel-echo";
import * as PusherModule from "pusher-js";
import { API_BASE_URL } from "./apiClient";

// pusher-js bản React Native export dạng { Pusher } thay vì default constructor
const PusherClient = PusherModule.Pusher || PusherModule.default || PusherModule;

// React Native không có đối tượng window toàn cục
global.Pusher = PusherClient;

function resolveFallbackReverbHost() {
  const match = String(API_BASE_URL || "").match(/^https?:\/\/([^/:]+)/i);
  return match?.[1] || "localhost";
}

export const echo = new Echo({
  broadcaster: "reverb",
  Pusher: PusherClient,
  key: process.env.EXPO_PUBLIC_REVERB_APP_KEY || "dlx565iyhajqkg8t2mxm",
  wsHost: process.env.EXPO_PUBLIC_REVERB_HOST || resolveFallbackReverbHost(),
  wsPort: Number(process.env.EXPO_PUBLIC_REVERB_PORT) || 8080,
  wssPort: Number(process.env.EXPO_PUBLIC_REVERB_PORT) || 8080,
  forceTLS: false,
  enabledTransports: ["ws", "wss"],
});

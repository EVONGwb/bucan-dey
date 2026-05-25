import apiClient from "../api/client.js";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export function isPushSupported() {
  return Boolean(
    window.isSecureContext &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
  );
}

export function getPushPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

async function getRegistration() {
  if (!isPushSupported()) {
    throw new Error("Este navegador no soporta notificaciones push.");
  }

  return await navigator.serviceWorker.ready;
}

export async function getPushState() {
  if (!isPushSupported()) {
    return {
      isSupported: false,
      permission: "unsupported",
      isSubscribed: false,
    };
  }

  const registration = await getRegistration();
  const subscription = await registration.pushManager.getSubscription();

  return {
    isSupported: true,
    permission: getPushPermission(),
    isSubscribed: Boolean(subscription),
  };
}

export async function requestPermission() {
  if (!isPushSupported()) {
    throw new Error("Este navegador no soporta notificaciones push.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permiso de notificaciones no concedido.");
  }

  return permission;
}

export async function subscribeToPush() {
  await requestPermission();

  const [{ data }, registration] = await Promise.all([
    apiClient.get("/push/vapid-public-key"),
    getRegistration(),
  ]);

  if (!data.public_key) {
    throw new Error("Las notificaciones push no estan configuradas.");
  }

  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.public_key),
    }));

  const subscriptionJson = subscription.toJSON();
  await apiClient.post("/push/subscribe", {
    endpoint: subscriptionJson.endpoint,
    keys: subscriptionJson.keys,
  });

  return subscription;
}

export async function unsubscribeFromPush() {
  const registration = await getRegistration();
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) return false;

  const subscriptionJson = subscription.toJSON();
  await apiClient.delete("/push/unsubscribe", {
    data: {
      endpoint: subscriptionJson.endpoint,
    },
  });
  await subscription.unsubscribe();
  return true;
}

export async function sendTestPush() {
  const response = await apiClient.post("/push/test");
  return response.data;
}

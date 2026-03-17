import { useState } from "react";

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
  supported: boolean;
}

const GYM_LAT = -26.0626601;
const GYM_LNG = 27.899925;
const RADIUS_METERS = 500;

function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    error: null,
    loading: false,
    supported: typeof navigator !== "undefined" && "geolocation" in navigator,
  });
  const [nearGym, setNearGym] = useState(false);
  const [distanceM, setDistanceM] = useState<number | null>(null);

  const requestLocation = () => {
    if (!state.supported) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const dist = getDistanceMeters(lat, lng, GYM_LAT, GYM_LNG);
        setState({ lat, lng, error: null, loading: false, supported: true });
        setDistanceM(Math.round(dist));
        setNearGym(dist <= RADIUS_METERS);
      },
      (err) => {
        setState((s) => ({ ...s, error: err.message, loading: false }));
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return { ...state, nearGym, distanceM, requestLocation, GYM_LAT, GYM_LNG };
}

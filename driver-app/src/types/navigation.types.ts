// Typed route params for Expo Router screens
// These match the file-based routing structure under src/app/

export type RootRoutes = {
  index: undefined;
  'network-error': undefined;
  '+not-found': undefined;
  settings: undefined;
  '(auth)/login': undefined;
  '(tabs)/home': undefined;
  '(tabs)/students': undefined;
  '(tabs)/history': undefined;
  '(tabs)/notifications': undefined;
  '(tabs)/profile': undefined;
  'trip/live-trip': { tripId: string };
  'trip/stops': { tripId: string };
};

export type TabRoute = 'home' | 'students' | 'history' | 'notifications' | 'profile';

export type AuthRoute = 'login';

export type HiddenRoute = 'live-trip' | 'stops';

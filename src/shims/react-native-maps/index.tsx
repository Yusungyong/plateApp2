import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ReactNode,
} from 'react';
import {
  Platform,
  UIManager,
  findNodeHandle,
  requireNativeComponent,
  type HostComponent,
  type ViewProps,
} from 'react-native';

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type Region = LatLng & {
  latitudeDelta: number;
  longitudeDelta: number;
};

type MapViewProps = ViewProps & {
  provider?: 'google' | undefined;
  followsUserLocation?: boolean;
  children?: ReactNode;
};

type MarkerProps = ViewProps & {
  coordinate: LatLng;
  title?: string;
  description?: string;
  children?: ReactNode;
};

type CalloutProps = ViewProps & {
  tooltip?: boolean;
  children?: ReactNode;
};

type MapViewHandle = {
  animateToRegion: (region: Region, duration?: number) => void;
  animateCamera: (camera: unknown, duration?: number) => void;
  setCamera: (camera: unknown) => void;
  fitToElements: (edgePadding?: unknown, animated?: boolean) => void;
  fitToSuppliedMarkers: (
    markers: string[],
    edgePadding?: unknown,
    animated?: boolean,
  ) => void;
  fitToCoordinates: (
    coordinates: LatLng[],
    edgePadding?: unknown,
    animated?: boolean,
  ) => void;
  setMapBoundaries: (northEast: LatLng, southWest: LatLng) => void;
  setIndoorActiveLevelIndex: (activeLevelIndex: number) => void;
};

const NativeMapView = Platform.OS === 'android'
  ? (requireNativeComponent<MapViewProps>('AIRMap') as HostComponent<MapViewProps>)
  : null;
const NativeMarker = Platform.OS === 'android'
  ? (require('../../../node_modules/react-native-maps/src/specs/NativeComponentMarker')
      .default as HostComponent<MarkerProps>)
  : null;
const NativeCallout = Platform.OS === 'android'
  ? (require('../../../node_modules/react-native-maps/src/specs/NativeComponentCallout')
      .default as HostComponent<CalloutProps>)
  : null;

const dispatchMapCommand = (
  nativeRef: React.RefObject<HostComponent<MapViewProps> | null>,
  command: string,
  args: unknown[],
) => {
  const reactTag = findNodeHandle(nativeRef.current);
  if (typeof reactTag !== 'number') {
    return;
  }
  UIManager.dispatchViewManagerCommand(reactTag, command, args);
};

const AndroidMapView = forwardRef<MapViewHandle, MapViewProps>((props, ref) => {
  const nativeRef = useRef<HostComponent<MapViewProps> | null>(null);
  // Android compat view does not consume these props directly.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { provider: _provider, followsUserLocation: _followsUserLocation, ...rest } = props;

  useImperativeHandle(
    ref,
    () => ({
      animateToRegion: (region, duration = 500) => {
        dispatchMapCommand(nativeRef, 'animateToRegion', [region, duration]);
      },
      animateCamera: (camera, duration = 500) => {
        dispatchMapCommand(nativeRef, 'animateCamera', [camera, duration]);
      },
      setCamera: camera => {
        dispatchMapCommand(nativeRef, 'setCamera', [camera]);
      },
      fitToElements: (edgePadding = {}, animated = true) => {
        dispatchMapCommand(nativeRef, 'fitToElements', [edgePadding, animated]);
      },
      fitToSuppliedMarkers: (markers, edgePadding = {}, animated = true) => {
        dispatchMapCommand(nativeRef, 'fitToSuppliedMarkers', [
          markers,
          edgePadding,
          animated,
        ]);
      },
      fitToCoordinates: (coordinates, edgePadding = {}, animated = true) => {
        dispatchMapCommand(nativeRef, 'fitToCoordinates', [
          coordinates,
          edgePadding,
          animated,
        ]);
      },
      setMapBoundaries: (northEast, southWest) => {
        dispatchMapCommand(nativeRef, 'setMapBoundaries', [
          northEast,
          southWest,
        ]);
      },
      setIndoorActiveLevelIndex: activeLevelIndex => {
        dispatchMapCommand(nativeRef, 'setIndoorActiveLevelIndex', [
          activeLevelIndex,
        ]);
      },
    }),
    [],
  );

  return <NativeMapView ref={nativeRef} {...rest} />;
});

AndroidMapView.displayName = 'AndroidMapViewCompat';

const AndroidMarker = forwardRef<HostComponent<MarkerProps>, MarkerProps>(
  (props, ref) => <NativeMarker ref={ref} {...props} />,
);
AndroidMarker.displayName = 'AndroidMarkerCompat';

const AndroidCallout = forwardRef<HostComponent<CalloutProps>, CalloutProps>(
  (props, ref) => <NativeCallout ref={ref} {...props} />,
);
AndroidCallout.displayName = 'AndroidCalloutCompat';

const iOSModule = Platform.OS === 'android' ? null : require('../../../node_modules/react-native-maps');

const exported = Platform.OS === 'android'
  ? {
      default: AndroidMapView,
      Callout: AndroidCallout,
      Marker: AndroidMarker,
      PROVIDER_GOOGLE: 'google' as const,
    }
  : iOSModule;

const DefaultMapView = exported.default;
const Callout = exported.Callout;
const Marker = exported.Marker;
const PROVIDER_GOOGLE = exported.PROVIDER_GOOGLE;

export { Callout, Marker, PROVIDER_GOOGLE };
export default DefaultMapView;

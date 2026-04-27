package com.plateappnew;

import androidx.annotation.NonNull;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ThemedReactContext;
import com.rnmaps.maps.MapManager;
import com.rnmaps.maps.MapView;
import java.util.Map;

public class PlateMapManager extends MapManager {

  public PlateMapManager(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  protected @NonNull MapView createViewInstance(@NonNull ThemedReactContext reactContext) {
    return new PlateMapView(reactContext, googleMapOptions);
  }

  @Override
  public Map getExportedCustomBubblingEventTypeConstants() {
    return MapView.getExportedCustomBubblingEventTypeConstants();
  }

  @Override
  public Map getExportedCustomDirectEventTypeConstants() {
    return MapView.getExportedCustomDirectEventTypeConstants();
  }
}

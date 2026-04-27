package com.plateappnew;

import android.view.View;
import androidx.annotation.NonNull;
import com.facebook.react.uimanager.ThemedReactContext;
import com.google.android.gms.maps.GoogleMap;
import com.google.android.gms.maps.GoogleMapOptions;
import com.rnmaps.maps.MapView;
import java.util.Map;
import java.util.TreeMap;

public class PlateMapView extends MapView {
  private final Map<Integer, View> pendingFeatures = new TreeMap<>();

  public PlateMapView(
      @NonNull ThemedReactContext reactContext,
      GoogleMapOptions googleMapOptions
  ) {
    super(reactContext, googleMapOptions);
  }

  @Override
  public void addFeature(View child, int index) {
    if (map == null) {
      pendingFeatures.put(index, child);
      return;
    }
    super.addFeature(child, index);
  }

  @Override
  public int getFeatureCount() {
    return super.getFeatureCount() + pendingFeatures.size();
  }

  @Override
  public View getFeatureAt(int index) {
    View feature = super.getFeatureAt(index);
    return feature != null ? feature : pendingFeatures.get(index);
  }

  @Override
  public void removeFeatureAt(int index) {
    if (super.getFeatureAt(index) != null) {
      super.removeFeatureAt(index);
      return;
    }
    pendingFeatures.remove(index);
  }

  @Override
  public void onMapReady(@NonNull GoogleMap googleMap) {
    super.onMapReady(googleMap);
    if (pendingFeatures.isEmpty()) {
      return;
    }

    Map<Integer, View> featuresToAttach = new TreeMap<>(pendingFeatures);
    pendingFeatures.clear();
    for (Map.Entry<Integer, View> entry : featuresToAttach.entrySet()) {
      super.addFeature(entry.getValue(), entry.getKey());
    }
  }
}

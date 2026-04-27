package com.plateappnew;

import android.view.View;
import android.view.ViewParent;
import androidx.annotation.NonNull;
import com.facebook.react.bridge.ReactApplicationContext;
import com.rnmaps.fabric.MarkerManager;
import com.rnmaps.maps.MapCallout;
import com.rnmaps.maps.MapMarker;

public class PlateFabricMarkerManager extends MarkerManager {

  public PlateFabricMarkerManager(ReactApplicationContext context) {
    super(context);
  }

  @Override
  public void addView(@NonNull MapMarker parent, @NonNull View child, int index) {
    if (child instanceof MapCallout) {
      parent.setCalloutView((MapCallout) child);
    } else {
      parent.addView(child, index);
      if (index == 0) {
        child.addOnLayoutChangeListener(
            new View.OnLayoutChangeListener() {
              @Override
              public void onLayoutChange(
                  View v,
                  int left,
                  int top,
                  int right,
                  int bottom,
                  int oldLeft,
                  int oldTop,
                  int oldRight,
                  int oldBottom) {
                ViewParent parentView = v.getParent();
                if (!(parentView instanceof MapMarker)) {
                  return;
                }

                int newWidth = right - left;
                int newHeight = bottom - top;
                ((MapMarker) parentView).update(newWidth, newHeight);
              }
            });
      }
      parent.update(true);
    }
  }
}

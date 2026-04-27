package com.plateappnew;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class PlateMapsPackage implements ReactPackage {

  @Override
  public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
    List<NativeModule> modules = new ArrayList<>(1);
    modules.add(new PlateLocationModule(reactContext));
    return modules;
  }

  @Override
  public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
    PlateMapManager mapManager = new PlateMapManager(reactContext);
    PlateMapMarkerManager markerManager = new PlateMapMarkerManager();
    PlateMapCalloutManager calloutManager = new PlateMapCalloutManager();
    PlateFabricMarkerManager fabricMarkerManager =
        new PlateFabricMarkerManager(reactContext);
    com.rnmaps.fabric.CalloutManager fabricCalloutManager =
        new com.rnmaps.fabric.CalloutManager(reactContext);
    mapManager.setMarkerManager(markerManager);

    List<ViewManager> managers = new ArrayList<>(5);
    managers.add(mapManager);
    managers.add(markerManager);
    managers.add(calloutManager);
    managers.add(fabricMarkerManager);
    managers.add(fabricCalloutManager);
    return managers;
  }
}

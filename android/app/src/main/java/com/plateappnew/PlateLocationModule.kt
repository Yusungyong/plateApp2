package com.plateappnew

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource

class PlateLocationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  private val fusedClient by lazy {
    LocationServices.getFusedLocationProviderClient(reactContext)
  }

  override fun getName(): String = "PlateLocation"

  @ReactMethod
  fun getCurrentPosition(promise: Promise) {
    if (!hasLocationPermission()) {
      promise.resolve(null)
      return
    }

    fetchLastKnownLocation(promise)
  }

  private fun hasLocationPermission(): Boolean {
    val finePermission =
        ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
    val coarsePermission =
        ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
    return finePermission || coarsePermission
  }

  @SuppressLint("MissingPermission")
  private fun fetchLastKnownLocation(promise: Promise) {
    fusedClient.lastLocation
        .addOnSuccessListener { location ->
          if (location != null) {
            promise.resolve(
                Arguments.createMap().apply {
                  putDouble("latitude", location.latitude)
                  putDouble("longitude", location.longitude)
                })
            return@addOnSuccessListener
          }
          fetchCurrentLocation(promise)
        }
        .addOnFailureListener {
          fetchCurrentLocation(promise)
        }
  }

  @SuppressLint("MissingPermission")
  private fun fetchCurrentLocation(promise: Promise) {
    val cancellationTokenSource = CancellationTokenSource()
    fusedClient
        .getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cancellationTokenSource.token)
        .addOnSuccessListener { location ->
          if (location == null) {
            promise.resolve(null)
            return@addOnSuccessListener
          }
          promise.resolve(
              Arguments.createMap().apply {
                putDouble("latitude", location.latitude)
                putDouble("longitude", location.longitude)
              })
        }
        .addOnFailureListener {
          promise.resolve(null)
        }
  }
}

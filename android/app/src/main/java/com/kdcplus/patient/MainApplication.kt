package com.kdcplus.patient

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.livekit.reactnative.LiveKitReactNative
import com.livekit.reactnative.audio.AudioType

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    // Consultation calls (LiveKit): before React Native starts. Voice-call audio routing.
    LiveKitReactNative.setup(this, AudioType.CommunicationAudioType())
    createNotificationChannels()
    loadReactNative(this)
  }

  /**
   * Push notification channels, one per kind, so people can tune each in Android settings
   * (the server picks the channel for every message; firebase.json makes kdc_alerts the default).
   * Urgent ones pop up with sound because someone is waiting; updates arrive normally; offers
   * quietly. Creating them again only refreshes names and descriptions, never the user's choices.
   */
  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    fun channel(id: String, name: String, description: String, importance: Int) =
      NotificationChannel(id, name, importance).apply {
        this.description = description
        enableVibration(importance >= NotificationManager.IMPORTANCE_DEFAULT)
        setShowBadge(importance >= NotificationManager.IMPORTANCE_DEFAULT)
      }
    getSystemService(NotificationManager::class.java).createNotificationChannels(
      listOf(
        channel("kdc_alerts", "Your doctor is ready", "When your consultation is about to start", NotificationManager.IMPORTANCE_HIGH),
        channel("kdc_updates", "Appointments, orders and reports", "Bookings, prescriptions, lab reports, orders and payments", NotificationManager.IMPORTANCE_DEFAULT),
        channel("kdc_offers", "Offers and health tips", "KDC+ Plus offers and health updates", NotificationManager.IMPORTANCE_LOW),
      ),
    )
  }
}

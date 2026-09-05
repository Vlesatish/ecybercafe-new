import { CitizenService } from '../types';
import { db, servicesCol, getDocs, doc, setDoc, deleteDoc, onSnapshot } from '../firebase';

export const SERVICE_STORAGE_KEYS = [
  'ecyber_cached_services',
  'portal_services_backup',
  'citizen_services_cache',
  'citizen_services_backup',
  'saved_services_list'
];

/**
 * Requirement 3: Data Recovery Check
 * Checks key variations in localStorage to find any previously stored services data.
 */
export function getServicesWithRecoveryCheck(): CitizenService[] | null {
  console.log('🔍 [Data Recovery Check] Scanning local storage key variations for previous services data...');
  
  for (const key of SERVICE_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`✅ [Data Recovery Check] Recovered ${parsed.length} services from localStorage key: "${key}"`);
          return parsed;
        }
      }
    } catch (err) {
      console.warn(`⚠️ [Data Recovery Check] Failed to parse key "${key}":`, err);
    }
  }

  console.log('ℹ️ [Data Recovery Check] No previous services found in local storage key variations.');
  return null;
}

/**
 * Requirement 1 & 2: Prevent Data Overwrite & Safe Storage
 * Ensures initial dummy/default data is ONLY loaded if no existing data is found.
 * Never overwrites existing stored services with a smaller/empty/default list.
 */
export function safeSaveServicesToLocalStorage(newServices: CitizenService[]): CitizenService[] {
  if (!Array.isArray(newServices)) return [];

  const existingData = getServicesWithRecoveryCheck();

  // If newServices is smaller than existing stored items (e.g., 5 defaults vs 150+ user services),
  // PREVENT OVERWRITE! Safe migration keeps the larger/richer user dataset.
  if (existingData && existingData.length > newServices.length && newServices.length <= 10) {
    console.warn(
      `🛡️ [Prevent Data Overwrite] Blocked overwrite attempt! Existing stored services count: ${existingData.length}, incoming list count: ${newServices.length}. Retaining existing data.`
    );
    return existingData;
  }

  if (newServices.length > 0) {
    SERVICE_STORAGE_KEYS.forEach(key => {
      try {
        localStorage.setItem(key, JSON.stringify(newServices));
      } catch (e) {
        console.error(`Error saving services to ${key}:`, e);
      }
    });
  }

  return newServices;
}

/**
 * Firebase Firestore: Fetch Services directly from Cloud Firestore
 */
export async function fetchServicesFromFirestore(): Promise<CitizenService[]> {
  try {
    const snapshot = await getDocs(servicesCol);
    if (!snapshot.empty) {
      const services: CitizenService[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as CitizenService;
        if (data && data.id) {
          services.push(data);
        }
      });
      console.log(`🔥 [Firestore Client] Fetched ${services.length} services from Firebase Cloud Database.`);
      safeSaveServicesToLocalStorage(services);
      return services;
    }
  } catch (err) {
    console.error('⚠️ [Firestore Client] Error reading from Firebase:', err);
  }
  return [];
}

/**
 * Firebase Firestore: Real-time Listener for Instant Live Sync
 */
export function subscribeToFirestoreServices(onUpdate: (services: CitizenService[]) => void): () => void {
  try {
    return onSnapshot(servicesCol, (snapshot) => {
      if (!snapshot.empty) {
        const liveServices: CitizenService[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as CitizenService;
          if (data && data.id) {
            liveServices.push(data);
          }
        });
        console.log(`🔥 [Firestore Listener] Real-time sync received ${liveServices.length} services`);
        safeSaveServicesToLocalStorage(liveServices);
        onUpdate(liveServices);
      }
    }, (err) => {
      console.warn('⚠️ [Firestore Listener] Error on real-time listener:', err);
    });
  } catch (e) {
    console.warn('⚠️ [Firestore Listener] Could not attach snapshot listener:', e);
    return () => {};
  }
}

/**
 * Firebase Firestore: Save or Update a Service
 */
export async function saveServiceToFirestoreFrontend(service: CitizenService): Promise<void> {
  if (!service || !service.id) return;
  try {
    const docRef = doc(db, 'citizenServices', service.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(service)), { merge: true });
    console.log(`🔥 [Firestore Client] Service "${service.title}" (${service.id}) saved to Cloud Firestore.`);
  } catch (err) {
    console.error('⚠️ [Firestore Client] Error saving service to Firebase:', err);
  }
}

/**
 * Firebase Firestore: Delete a Service
 */
export async function deleteServiceFromFirestoreFrontend(serviceId: string): Promise<void> {
  if (!serviceId) return;
  try {
    const docRef = doc(db, 'citizenServices', serviceId);
    await deleteDoc(docRef);
    console.log(`🔥 [Firestore Client] Service ${serviceId} deleted from Cloud Firestore.`);
  } catch (err) {
    console.error('⚠️ [Firestore Client] Error deleting service from Firebase:', err);
  }
}

/**
 * Auto-sync recovered services back to server/Firestore if server returned fewer services
 */
export async function syncServicesWithServerIfNeeded(serverServices: CitizenService[]): Promise<CitizenService[]> {
  // If server already returned a valid service list, cache and return immediately (0ms)
  if (Array.isArray(serverServices) && serverServices.length > 0) {
    safeSaveServicesToLocalStorage(serverServices);
    return serverServices;
  }

  // Fallback: If server returned empty, check local storage cache
  const recovered = getServicesWithRecoveryCheck();
  if (recovered && recovered.length > 0) {
    return recovered;
  }

  // Last resort fallback: read Firestore directly
  const firestoreServices = await fetchServicesFromFirestore();
  if (firestoreServices.length > 0) {
    safeSaveServicesToLocalStorage(firestoreServices);
    return firestoreServices;
  }

  return [];
}

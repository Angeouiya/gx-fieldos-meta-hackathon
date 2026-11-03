export type FieldPosition = { latitude: number; longitude: number; accuracy: number };
export type FieldPositionResult = { position: FieldPosition; approximate: boolean };

function locationError(error: GeolocationPositionError): Error {
  if (error.code === 1) return new Error("Localisation refusée pour gx.agrix.africa dans ce navigateur. Autorisez ce site, ou créez le scan sans position.");
  if (error.code === 3) return new Error("La localisation a dépassé le délai. Réessayez à l’extérieur ou créez le scan sans position.");
  return new Error("Aucune position disponible sur cet appareil. Vous pouvez créer le scan sans position.");
}

function positionResult(result: GeolocationPosition, approximate: boolean): FieldPositionResult {
  const { latitude, longitude, accuracy } = result.coords;
  if (![latitude, longitude, accuracy].every(Number.isFinite) || accuracy < 0) {
    throw new Error("Aucune position valide sur cet appareil. Vous pouvez créer le scan sans position.");
  }
  return { position: { latitude, longitude, accuracy }, approximate };
}

export function getFieldPosition(geolocation: Geolocation | undefined): Promise<FieldPositionResult> {
  if (!geolocation) return Promise.reject(new Error("Localisation indisponible sur cet appareil. Vous pouvez créer le scan sans position."));
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      (result) => { try { resolve(positionResult(result, false)); } catch (error) { reject(error); } },
      (failure) => {
        if (failure.code === 1) { reject(locationError(failure)); return; }
        geolocation.getCurrentPosition(
          (result) => { try { resolve(positionResult(result, true)); } catch (error) { reject(error); } },
          (retryFailure) => reject(locationError(retryFailure)),
          { enableHighAccuracy: false, timeout: 12_000, maximumAge: 300_000 },
        );
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  });
}

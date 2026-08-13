import { Prisma } from "@prisma/client";

// Fragmento SQL para construir un geography(Point,4326) desde lng/lat.
export function pointGeo(lng: number, lat: number) {
  return Prisma.sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
}

export interface LatLng {
  lat: number;
  lng: number;
}

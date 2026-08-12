import { Suspense } from 'react';
import { IncidentsMap } from '@/components/IncidentsMap';

export default function MapaPage() {
  return (
    <Suspense fallback={<div className="web-app" />}>
      <IncidentsMap />
    </Suspense>
  );
}

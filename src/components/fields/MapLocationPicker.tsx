'use client';

import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Standard Leaflet CDN pins to guarantee perfect image scaling and retrieval
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

import { Search, Loader2, MapPin, Maximize2, Minimize2, X } from 'lucide-react';

interface MapLocationPickerProps {
  lat?: number | null;
  lng?: number | null;
  onChange: (lat: number, lng: number) => void;
}

export default function MapLocationPicker({ lat, lng, onChange }: MapLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Force progressive recalculation bursts to guarantee perfect visual locks during and after transition completion
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    // Fire immediately, at peak curve, and after cooldown to cover all browser transition curves
    const delays = [50, 150, 300, 600];
    const timers = delays.map(delay => 
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [isExpanded]);

  // BULLETPROOF SIZE RECALCULATION: Using ResizeObserver fixes Modal animation broken tiles!
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // Set an explicit timeout just to catch initial mounting during rapid react transitions
    const initTimer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 500);

    // Dynamically watch DOM node size changes (crucial for fixing modal opening expansion issues)
    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    
    observer.observe(mapContainerRef.current);
    
    return () => {
      clearTimeout(initTimer);
      observer.disconnect();
    };
  }, [mapContainerRef]);

  // Enhanced Geocode Engine with real-time visual-bounds BIASING
  const handleSearch = async (queryText?: string) => {
    const q = typeof queryText === 'string' ? queryText.trim() : searchQuery.trim();
    if (q.length < 3) return;
    
    setIsSearching(true);
    setShowDropdown(true);
    try {
      let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6`;
      
      // If map is active, fetch current window coordinates to BIAS the results towards local area
      if (mapInstanceRef.current) {
        const bounds = mapInstanceRef.current.getBounds();
        // viewbox formatting: <left>,<top>,<right>,<bottom>
        const viewboxStr = `${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()},${bounds.getSouth()}`;
        url += `&viewbox=${viewboxStr}`; 
      }

      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'EliteMap-VYN' }
      });
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Search Fail", err);
    } finally { setIsSearching(false); }
  };

  // SMART AUTO-SUGGEST: Debounce search triggers as user types
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    
    const typeTimer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 600); // Wait 600ms after last keystroke before firing API call

    return () => clearTimeout(typeTimer);
  }, [searchQuery]);

  const selectResult = (res: any) => {
    const newPos: [number, number] = [parseFloat(res.lat), parseFloat(res.lon)];
    onChange(newPos[0], newPos[1]);
    setSearchQuery(res.display_name);
    setShowDropdown(false);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(newPos, 16);
      if (markerRef.current) markerRef.current.setLatLng(newPos);
      else markerRef.current = L.marker(newPos, { icon: DefaultIcon }).addTo(mapInstanceRef.current);
    }
  };

  // MASTER MOUNT EFFECT
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const hasProps = typeof lat === 'number' && typeof lng === 'number';
    const initialPos: [number, number] = hasProps ? [lat as number, lng as number] : [30.0444, 31.2357];
    
    const map = L.map(mapContainerRef.current, {
      center: initialPos,
      zoom: hasProps ? 15 : 13,
      scrollWheelZoom: false,
      fadeAnimation: false, // Speeds up tile fetching to reduce grey box duration
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    if (hasProps) {
      markerRef.current = L.marker(initialPos, { icon: DefaultIcon }).addTo(map);
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      const cPos: [number, number] = [e.latlng.lat, e.latlng.lng];
      onChange(cPos[0], cPos[1]);
      if (markerRef.current) {
        markerRef.current.setLatLng(cPos);
      } else {
        markerRef.current = L.marker(cPos, { icon: DefaultIcon }).addTo(map);
      }
    });

    mapInstanceRef.current = map;

    // Sync visual tiles explicitly immediately after instance creation completes
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []); 

  // AUTO-GEOLOCATION: Safely delayed to let parent form values hydrate first!
  const hasAttemptedGeo = useRef(false);
  useEffect(() => {
    if (hasAttemptedGeo.current) return;
    // Short cooldown allowing React form reset batching to finish propagating props
    const timer = setTimeout(() => {
      // Re-check props: if parent populated them from DB, ABORT auto-geo completely!
      if (typeof lat === 'number' || typeof lng === 'number') {
        hasAttemptedGeo.current = true;
        return;
      }
      
      if (navigator.geolocation && mapInstanceRef.current) {
        hasAttemptedGeo.current = true;
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!mapInstanceRef.current) return;
            // FINAL check right before setting to prevent overriding delayed props
            if (typeof lat === 'number' || typeof lng === 'number') return;
            
            const geoPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            mapInstanceRef.current.setView(geoPos, 15);
            if (markerRef.current) markerRef.current.setLatLng(geoPos);
            else markerRef.current = L.marker(geoPos, { icon: DefaultIcon }).addTo(mapInstanceRef.current);
            onChange(geoPos[0], geoPos[1]);
            setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100);
          },
          () => console.warn("Geo blocked"),
          { enableHighAccuracy: true }
        );
      }
    }, 800);
    
    return () => clearTimeout(timer);
  }, [lat, lng]);

  // Prop Changes Sync
  useEffect(() => {
    if (typeof lat === 'number' && typeof lng === 'number' && mapInstanceRef.current) {
      const currentLatLng = markerRef.current?.getLatLng();
      if (currentLatLng && Math.abs(currentLatLng.lat - lat) < 0.00001 && Math.abs(currentLatLng.lng - lng) < 0.00001) {
        return;
      }
      const nextPos: [number, number] = [lat, lng];
      mapInstanceRef.current.setView(nextPos, mapInstanceRef.current.getZoom());
      if (markerRef.current) markerRef.current.setLatLng(nextPos);
      else markerRef.current = L.marker(nextPos, { icon: DefaultIcon }).addTo(mapInstanceRef.current);
    }
  }, [lat, lng]);

  return (
    <>
    <div className={`bg-muted overflow-hidden transition-all duration-200 ${isExpanded ? "fixed inset-0 z-[9999] w-screen h-screen rounded-none" : "relative w-full h-72 rounded-xl border border-border shadow-inner"}`}>
      
      {isExpanded && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-[1000] flex flex-col gap-1.5">
          <div className="relative flex items-center w-full bg-white shadow-lg border border-black/10 rounded-xl overflow-hidden">
            <div className="pl-3 text-muted-foreground"><Search className="w-4 h-4" /></div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSearch();
                }
              }}
              placeholder="Search address or landmark..."
              className="flex-1 h-11 px-3 bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <div className="pr-2 flex items-center">
              {searchQuery.length > 0 && (
                <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]); setShowDropdown(false); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 mr-1"><X className="w-3.5 h-3.5" /></button>
              )}
              <button type="button" onClick={() => handleSearch()} disabled={isSearching} className="px-4 h-8 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5 shadow-sm">
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Find'}
              </button>
            </div>
          </div>

          {showDropdown && searchResults.length > 0 && (
            <div className="w-full bg-white rounded-xl shadow-xl border border-black/10 max-h-64 overflow-y-auto py-1 animate-in fade-in zoom-in-95">
              {searchResults.map((res) => (
                <button key={res.place_id} type="button" onClick={() => selectResult(res)} className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-start gap-3 border-b border-slate-100 last:border-none">
                  <MapPin className="w-4 h-4 mt-0.5 text-orange-500 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800 leading-tight">{res.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-center w-10 h-10 bg-white hover:bg-slate-50 text-slate-700 shadow-lg rounded-xl border border-black/10 transition-all"
        >
          {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>

      <div className="absolute bottom-4 left-4 z-[1000] bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-[11px] font-medium shadow-md pointer-events-none">
        {isExpanded ? 'Click to pick or close' : 'Click anywhere or Expand to Search'}
      </div>

      <div ref={mapContainerRef} className="w-full h-full z-10 bg-[#f8f9fa]" style={{ outline: 'none' }} onClick={() => setShowDropdown(false)} />
    </div>
    {isExpanded && <div className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm" />}
    </>
  );
}

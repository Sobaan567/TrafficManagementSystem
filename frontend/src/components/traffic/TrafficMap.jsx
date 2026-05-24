import React, { useState, useEffect } from 'react';
import GoogleMapReact from 'google-map-react';
import { trafficAPI } from '../../services/api';

const safeDistanceToMouse = (point, mouse) => {
  if (!point || !mouse) return Number.MAX_SAFE_INTEGER;
  return Math.hypot(point.x - mouse.x, point.y - mouse.y);
};

const Marker = ({ text }) => (
  <div style={{
    backgroundColor: '#D2E823',
    color: '#09090B',
    borderRadius: '50%',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    border: '2px solid #09090B'
  }}>
    {text}
  </div>
);

const OfficerMarker = ({ name }) => (
  <div title={name} style={{
    backgroundColor: '#09090B',
    color: '#F8F4E8',
    borderRadius: '6px',
    minWidth: '92px',
    padding: '7px 9px',
    fontSize: '11px',
    fontWeight: 'bold',
    border: '2px solid #D2E823',
    boxShadow: '3px 3px 0 #D2E823',
    transform: 'translate(-50%, -100%)',
    textAlign: 'center',
    whiteSpace: 'nowrap'
  }}>
    {name}
  </div>
);

export default function TrafficMap({ officers = [] }) {
  const [locations, setLocations] = useState([]);
  const [center, setCenter] = useState({
    lat: 24.8607, // Karachi default
    lng: 67.0011
  });

  const officerMarkers = officers.length > 0 ? officers : [
    { id: 1, name: 'Shafiq Rana', lat: 24.8607, lng: 67.0011 },
    { id: 2, name: 'Ayesha Khan', lat: 24.8738, lng: 67.0321 },
    { id: 3, name: 'Bilal Ahmed', lat: 24.9180, lng: 67.0971 }
  ];

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await trafficAPI.getLocations();
      if (response.data.success && response.data.data) {
        const nextLocations = response.data.data.map((location) => ({
          ...location,
          lat: Number(location.Latitude ?? location.latitude),
          lng: Number(location.Longitude ?? location.longitude),
        })).filter((location) => Number.isFinite(location.lat) && Number.isFinite(location.lng));
        setLocations(nextLocations);
        // Set center to first location if available
        if (nextLocations.length > 0) {
          setCenter({
            lat: nextLocations[0].lat,
            lng: nextLocations[0].lng
          });
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      // Show default map even if error
    }
  };

  return (
    <div style={{ width: '100%', height: '400px', marginTop: '20px' }}>
      <GoogleMapReact
        bootstrapURLKeys={{ key: process.env.REACT_APP_GOOGLE_MAPS_API_KEY }}
        defaultCenter={center}
        defaultZoom={11}
        center={center}
        distanceToMouse={safeDistanceToMouse}
      >
        {locations.map((location, index) => (
          <Marker
            key={index}
            lat={location.lat}
            lng={location.lng}
            text={index + 1}
          />
        ))}
        {officerMarkers.map((officer) => (
          <OfficerMarker
            key={officer.id || officer.name}
            lat={Number(officer.lat)}
            lng={Number(officer.lng)}
            name={officer.name}
          />
        ))}
      </GoogleMapReact>
    </div>
  );
}

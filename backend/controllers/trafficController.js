const { executeQuery } = require('../config/database');
const axios = require('axios');

const geocodeTrafficLocation = async (locationName, cityName) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !locationName) {
    return { latitude: null, longitude: null };
  }

  try {
    const address = [locationName, cityName].filter(Boolean).join(', ');
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address,
        key: apiKey,
      },
      timeout: 8000,
    });

    const coordinates = response.data?.results?.[0]?.geometry?.location;
    return coordinates
      ? { latitude: coordinates.lat, longitude: coordinates.lng }
      : { latitude: null, longitude: null };
  } catch (error) {
    console.error('Traffic situation geocoding error:', error.message);
    return { latitude: null, longitude: null };
  }
};

exports.getTrafficStatus = async (req, res) => {
  try {
    res.json({ success: true, data: { totalLocations: 3, activeIncidents: 0, congestionLevel: 'Low' } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get traffic status' });
  }
};

exports.getTrafficJams = async (req, res) => {
  try {
    res.json({ success: true, data: [{ locationId: 1, locationName: 'Shahrah-e-Faisal', severity: 'Low', congestionLevel: 20, estimatedDelay: 5 }] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get traffic jams' });
  }
};

exports.getTrafficHeatmap = async (req, res) => {
  try {
    res.json({ success: true, data: { heatmapData: [], timestamp: new Date().toISOString() } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get heatmap' });
  }
};

exports.reportTrafficEvent = async (req, res) => {
  try {
    const { locationId, eventType, severity, description } = req.body;
    res.json({ success: true, message: 'Traffic event reported successfully', data: { eventId: 1, locationId, eventType, severity, description } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to report event' });
  }
};

exports.getTrafficEvents = async (req, res) => {
  try {
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get events' });
  }
};

exports.updateTrafficEvent = async (req, res) => {
  try {
    res.json({ success: true, message: 'Event updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update event' });
  }
};

exports.getCameras = async (req, res) => {
  try {
    res.json({ success: true, data: [{ cameraId: 1, cameraName: 'Camera-001', status: 'Active' }, { cameraId: 2, cameraName: 'Camera-002', status: 'Active' }] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get cameras' });
  }
};

exports.getCameraFeed = async (req, res) => {
  try {
    res.json({ success: true, data: { feedUrl: 'rtsp://camera-url', status: 'Active' } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get camera feed' });
  }
};

exports.getLocations = async (req, res) => {
  try {
    res.json({
      success: true,
      data: [
        { locationId: 1, name: 'Shahrah-e-Faisal', latitude: 24.8607, longitude: 67.0011 },
        { locationId: 2, name: 'M.A. Jinnah Road', latitude: 24.8738, longitude: 67.0321 },
        { locationId: 3, name: 'University Road', latitude: 24.9180, longitude: 67.0971 },
      ],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get locations' });
  }
};

exports.getLocationDetails = async (req, res) => {
  try {
    res.json({ success: true, data: { locationId: 1, name: 'Shahrah-e-Faisal', latitude: 24.8607, longitude: 67.0011, speedLimit: 60, zoneType: 'Main Road' } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get location details' });
  }
};

// Add traffic situation (Officer)
exports.addTrafficSituation = async (req, res) => {
  try {
    const { locationName, cityName, description, trafficLevel } = req.body;
    let { latitude, longitude } = req.body;

    if (!locationName || !cityName || !description || !trafficLevel) {
      return res.status(400).json({ success: false, message: 'locationName, cityName, description and trafficLevel are required' });
    }

    if (!latitude || !longitude) {
      const geocodedLocation = await geocodeTrafficLocation(locationName, cityName);
      latitude = geocodedLocation.latitude;
      longitude = geocodedLocation.longitude;
    }

    await executeQuery(
      `INSERT INTO TrafficSituations (LocationName, CityName, Description, TrafficLevel, Latitude, Longitude, ReportedAt)
       VALUES (@locationName, @cityName, @description, @trafficLevel, @latitude, @longitude, GETDATE())`,
      { locationName, cityName, description, trafficLevel, latitude: latitude || null, longitude: longitude || null }
    );

    res.json({ success: true, message: 'Traffic situation reported successfully' });
  } catch (error) {
    console.error('Add traffic situation error:', error);
    res.status(500).json({ success: false, message: 'Failed to report traffic situation' });
  }
};

// Get traffic situations (Public)
exports.getTrafficSituations = async (req, res) => {
  try {
    const result = await executeQuery(
      `SELECT TOP 50 LocationName, CityName, Description, TrafficLevel, Latitude, Longitude, ReportedAt
       FROM TrafficSituations
       ORDER BY ReportedAt DESC`
    );
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Get traffic situations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch traffic situations' });
  }
};

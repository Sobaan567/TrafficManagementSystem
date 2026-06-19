const { executeQuery } = require('../config/database');
const axios = require('axios');
const { logActivity } = require('../utils/systemEvents');
const { addDemeritEntry, ensureSmartFeatureTables } = require('./smartFeatureController');

const normalizeDemeritPoints = (value) => Math.max(0, Math.min(Number(value) || 0, 100));

const geocodeLocation = async (locationName) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !locationName) {
    return { latitude: 0.0, longitude: 0.0, cityName: 'Unknown', stateName: 'Unknown' };
  }

  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: locationName,
        key: apiKey,
      },
      timeout: 8000,
    });

    const result = response.data?.results?.[0];
    const coordinates = result?.geometry?.location;

    if (!coordinates) {
      return { latitude: 0.0, longitude: 0.0, cityName: 'Unknown', stateName: 'Unknown' };
    }

    const findAddressPart = (type) =>
      result.address_components?.find((part) => part.types.includes(type))?.long_name || 'Unknown';

    return {
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      cityName: findAddressPart('locality'),
      stateName: findAddressPart('administrative_area_level_1'),
    };
  } catch (error) {
    console.error('Location geocoding error:', error.message);
    return { latitude: 0.0, longitude: 0.0, cityName: 'Unknown', stateName: 'Unknown' };
  }
};

// Officer adds violation + auto-generates challan
exports.officerAddViolation = async (req, res) => {
  try {
    const {
      registrationNumber, violationType, severity, speed, speedLimit,
      locationName, description, fineAmount, ownerName, ownerPhone, demeritPoints,
    } = req.body;

    if (!registrationNumber || !violationType || !severity || !locationName || !fineAmount || !ownerName || !ownerPhone) {
      return res.status(400).json({ success: false, message: 'All required fields must be filled.' });
    }
    await ensureSmartFeatureTables();

    // Get or create vehicle
    let vehicleResult = await executeQuery(
      `SELECT VehicleID FROM Vehicles WHERE RegistrationNumber = @reg`,
      { reg: registrationNumber.toUpperCase() }
    );

    let vehicleId;
    if (vehicleResult.recordset.length === 0) {
      const insertVehicle = await executeQuery(
        `INSERT INTO Vehicles (RegistrationNumber, VehicleType, OwnerName, OwnerPhone) VALUES (@reg, 'Car', @ownerName, @phone); SELECT SCOPE_IDENTITY() as VehicleID`,
        { reg: registrationNumber.toUpperCase(), ownerName, phone: ownerPhone }
      );
      vehicleId = insertVehicle.recordset[0].VehicleID;
    } else {
      vehicleId = vehicleResult.recordset[0].VehicleID;
      await executeQuery(
        `UPDATE Vehicles SET OwnerName = @ownerName, OwnerPhone = @phone, UpdatedAt = GETDATE() WHERE VehicleID = @vehicleId`,
        { vehicleId, ownerName, phone: ownerPhone }
      );
    }

    // Get or create location
    const geocodedLocation = await geocodeLocation(locationName);
    let locationResult = await executeQuery(
      `SELECT TOP 1 LocationID FROM Locations WHERE LocationName = @locationName`,
      { locationName }
    );

    let locationId;
    if (locationResult.recordset.length === 0) {
      const insertLocation = await executeQuery(
        `INSERT INTO Locations (LocationName, CityName, StateName, Latitude, Longitude) VALUES (@locationName, @cityName, @stateName, @latitude, @longitude); SELECT SCOPE_IDENTITY() as LocationID`,
        {
          locationName,
          cityName: geocodedLocation.cityName,
          stateName: geocodedLocation.stateName,
          latitude: geocodedLocation.latitude,
          longitude: geocodedLocation.longitude,
        }
      );
      locationId = insertLocation.recordset[0].LocationID;
    } else {
      locationId = locationResult.recordset[0].LocationID;
      await executeQuery(
        `UPDATE Locations SET CityName = @cityName, StateName = @stateName, Latitude = @latitude, Longitude = @longitude, UpdatedAt = GETDATE() WHERE LocationID = @locationId AND Latitude = 0 AND Longitude = 0`,
        {
          locationId,
          cityName: geocodedLocation.cityName,
          stateName: geocodedLocation.stateName,
          latitude: geocodedLocation.latitude,
          longitude: geocodedLocation.longitude,
        }
      );
    }

    // Insert violation
    const violationInsert = await executeQuery(
      `INSERT INTO Violations (VehicleID, ViolationType, Severity, ViolationDateTime, Speed, SpeedLimit, LocationID, Status) VALUES (@vehicleId, @violationType, @severity, GETDATE(), @speed, @speedLimit, @locationId, 'Detected'); SELECT SCOPE_IDENTITY() as ViolationID`,
      {
        vehicleId,
        violationType,
        severity,
        speed: speed ? Number(speed) : 0,
        speedLimit: speedLimit ? Number(speedLimit) : 0,
        locationId,
      }
    );

    const violationId = violationInsert.recordset[0].ViolationID;

    // Look up OfficerID from UserID stored in JWT
    const officerResult = await executeQuery(
      `SELECT OfficerID FROM Officers WHERE UserID = @userId`,
      { userId: req.user.userId }
    );

    if (officerResult.recordset.length === 0) {
      return res.status(403).json({ success: false, message: 'Officer record not found for this user.' });
    }

    const officerId = officerResult.recordset[0].OfficerID;
    const challanNumber = `CH-${new Date().getFullYear()}-${Date.now()}`;

    // Insert challan
    const challanInsert = await executeQuery(
      `INSERT INTO Challans (ChallanNumber, ViolationID, VehicleID, OwnerName, OwnerPhone, IssuedByOfficerID, ViolationType, Location, FineAmount, DueDate, ChallanStatus, PaymentStatus, CreatedAt)
       VALUES (@challanNumber, @violationId, @vehicleId, @ownerName, @ownerPhone, @officerId, @violationType, @locationName, @fineAmount, DATEADD(DAY, 30, GETDATE()), 'Issued', 'Unpaid', GETDATE());
       SELECT SCOPE_IDENTITY() as ChallanID`,
      {
        challanNumber,
        violationId,
        vehicleId,
        ownerName,
        ownerPhone,
        officerId,
        violationType,
        locationName,
        fineAmount: Number(fineAmount),
      }
    );
    const challanId = challanInsert.recordset[0].ChallanID;
    const points = normalizeDemeritPoints(demeritPoints);
    const demerit = points > 0
      ? await addDemeritEntry({
        registrationNumber: registrationNumber.toUpperCase(),
        vehicleId,
        challanId,
        points,
        reason: `${violationType} challan`,
        userId: req.user.userId,
      })
      : null;

    await logActivity({
      user: req.user,
      actionType: 'Violation Added',
      entityType: 'Challan',
      entityId: challanNumber,
      description: `Officer created challan ${challanNumber} for ${registrationNumber.toUpperCase()} (${violationType})`,
    });

    res.json({ success: true, message: 'Violation and challan created successfully', challanNumber, challanId, demerit });

  } catch (error) {
    console.error('Officer add violation error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to add violation' });
  }
};

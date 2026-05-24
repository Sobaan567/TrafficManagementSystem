-- Traffic Management System - MSSQL Database Schema
-- Database: TrafficManagementSystem
-- Version: 1.0

-- Create Database
CREATE DATABASE TrafficManagementSystem;
GO

USE TrafficManagementSystem;
GO

-- ============================================================================
-- TABLE: Users
-- ============================================================================
CREATE TABLE Users (
    UserID INT PRIMARY KEY IDENTITY(1,1),
    Username NVARCHAR(100) NOT NULL UNIQUE,
    Email NVARCHAR(150) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(MAX) NOT NULL,
    FirstName NVARCHAR(100),
    LastName NVARCHAR(100),
    PhoneNumber NVARCHAR(20),
    Role NVARCHAR(50) NOT NULL CHECK (Role IN ('Admin', 'Officer', 'Public', 'Supervisor')),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    LastLoginAt DATETIME,
    ProfileImageURL NVARCHAR(500),
    Address NVARCHAR(500),
    City NVARCHAR(100),
    State NVARCHAR(100),
    ZipCode NVARCHAR(20),
    Country NVARCHAR(100)
);
GO

-- ============================================================================
-- TABLE: PublicUserProfiles
-- ============================================================================
CREATE TABLE PublicUserProfiles (
    PublicProfileID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL UNIQUE,
    NICNumber NVARCHAR(30) NOT NULL UNIQUE,
    VehicleRegistrationNumber NVARCHAR(50) NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);
GO

-- ============================================================================
-- TABLE: Officers
-- ============================================================================
CREATE TABLE Officers (
    OfficerID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL UNIQUE,
    BadgeNumber NVARCHAR(50) NOT NULL UNIQUE,
    Rank NVARCHAR(100),
    Department NVARCHAR(100),
    AssignedZone NVARCHAR(200),
    Latitude DECIMAL(10, 8),
    Longitude DECIMAL(11, 8),
    LastLocationUpdate DATETIME,
    IsOnDuty BIT DEFAULT 0,
    VehicleAssigned NVARCHAR(100),
    StartDate DATE,
    PerformanceRating DECIMAL(3,2),
    TotalChallansIssued INT DEFAULT 0,
    ChallansCanceledCount INT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);
GO

-- ============================================================================
-- TABLE: Vehicles
-- ============================================================================
CREATE TABLE Vehicles (
    VehicleID INT PRIMARY KEY IDENTITY(1,1),
    RegistrationNumber NVARCHAR(50) NOT NULL UNIQUE,
    VINNumber NVARCHAR(100),
    OwnerName NVARCHAR(150),
    OwnerEmail NVARCHAR(150),
    OwnerPhone NVARCHAR(20),
    VehicleType NVARCHAR(50) NOT NULL CHECK (VehicleType IN ('Car', 'Motorcycle', 'Truck', 'Bus', 'Auto', 'Cycle', 'Other')),
    Make NVARCHAR(100),
    Model NVARCHAR(100),
    Color NVARCHAR(50),
    ManufactureYear INT,
    InsuranceExpiry DATE,
    PollutionCertificateExpiry DATE,
    RegistrationExpiry DATE,
    FitnessCertificateExpiry DATE,
    IsBlacklisted BIT DEFAULT 0,
    BlacklistReason NVARCHAR(500),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
GO

-- ============================================================================
-- TABLE: Locations
-- ============================================================================
CREATE TABLE Locations (
    LocationID INT PRIMARY KEY IDENTITY(1,1),
    LocationName NVARCHAR(200) NOT NULL,
    Latitude DECIMAL(10, 8) NOT NULL,
    Longitude DECIMAL(11, 8) NOT NULL,
    CityName NVARCHAR(100),
    StateName NVARCHAR(100),
    ZoneType NVARCHAR(50) CHECK (ZoneType IN ('School', 'Hospital', 'Highway', 'Residential', 'Commercial', 'Industrial', 'Intersection')),
    SpeedLimit INT DEFAULT 40,
    IsHighAccidentZone BIT DEFAULT 0,
    PriorityLevel INT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
GO

-- ============================================================================
-- TABLE: Cameras
-- ============================================================================
CREATE TABLE Cameras (
    CameraID INT PRIMARY KEY IDENTITY(1,1),
    LocationID INT NOT NULL,
    CameraName NVARCHAR(200),
    CameraType NVARCHAR(100) CHECK (CameraType IN ('Speed', 'Red Light', 'Parking', 'General')),
    Latitude DECIMAL(10, 8),
    Longitude DECIMAL(11, 8),
    Status NVARCHAR(50) DEFAULT 'Active' CHECK (Status IN ('Active', 'Inactive', 'Maintenance')),
    Resolution NVARCHAR(50),
    IsNightVision BIT DEFAULT 0,
    LastServiceDate DATE,
    FOREIGN KEY (LocationID) REFERENCES Locations(LocationID) ON DELETE CASCADE
);
GO

-- ============================================================================
-- TABLE: Violations
-- ============================================================================
CREATE TABLE Violations (
    ViolationID INT PRIMARY KEY IDENTITY(1,1),
    VehicleID INT NOT NULL,
    CameraID INT,
    OfficerID INT,
    LocationID INT NOT NULL,
    ViolationType NVARCHAR(100) NOT NULL CHECK (ViolationType IN (
        'Speeding',
        'Red Light Violation',
        'Illegal Parking',
        'No Helmet',
        'Overloading',
        'Wrong Side Driving',
        'No License Plate',
        'Expired Insurance',
        'Expired Registration',
        'Expired Fitness Certificate',
        'Dangerous Driving',
        'Mobile Phone Usage',
        'No Seat Belt',
        'Pollution Certificate Expired',
        'Other'
    )),
    Severity NVARCHAR(50) CHECK (Severity IN ('Minor', 'Moderate', 'Major', 'Critical')),
    ViolationDateTime DATETIME NOT NULL,
    Description NVARCHAR(500),
    EvidenceImageURL NVARCHAR(500),
    EvidenceVideoURL NVARCHAR(500),
    Speed INT,
    SpeedLimit INT,
    Status NVARCHAR(50) DEFAULT 'Detected' CHECK (Status IN ('Detected', 'Reported', 'Challenged', 'Resolved')),
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (VehicleID) REFERENCES Vehicles(VehicleID),
    FOREIGN KEY (CameraID) REFERENCES Cameras(CameraID),
    FOREIGN KEY (OfficerID) REFERENCES Officers(OfficerID),
    FOREIGN KEY (LocationID) REFERENCES Locations(LocationID)
);
GO

-- ============================================================================
-- TABLE: Challans (E-Challan)
-- ============================================================================
CREATE TABLE Challans (
    ChallanID INT PRIMARY KEY IDENTITY(1,1),
    ChallanNumber NVARCHAR(50) NOT NULL UNIQUE,
    ViolationID INT NOT NULL UNIQUE,
    VehicleID INT NOT NULL,
    OwnerName NVARCHAR(150),
    OwnerEmail NVARCHAR(150),
    OwnerPhone NVARCHAR(20),
    IssuedByOfficerID INT NOT NULL,
    IssueDateTime DATETIME DEFAULT GETDATE(),
    ViolationType NVARCHAR(100),
    Location NVARCHAR(200),
    FineAmount DECIMAL(10,2) NOT NULL,
    Description NVARCHAR(500),
    ChallanStatus NVARCHAR(50) DEFAULT 'Issued' CHECK (ChallanStatus IN (
        'Issued',
        'Pending Payment',
        'Paid',
        'Cancelled',
        'Appealed',
        'Overdue',
        'Expired'
    )),
    PaymentStatus NVARCHAR(50) DEFAULT 'Unpaid' CHECK (PaymentStatus IN ('Unpaid', 'Partial', 'Paid')),
    PaymentDate DATETIME,
    PaymentMethod NVARCHAR(50),
    TransactionID NVARCHAR(100),
    PaidAmount DECIMAL(10,2) DEFAULT 0,
    RemainingAmount DECIMAL(10,2),
    DueDate DATE,
    AppealReason NVARCHAR(500),
    AppealStatus NVARCHAR(50),
    AppealDate DATETIME,
    ChallanImageURL NVARCHAR(500),
    PermitNumber NVARCHAR(50),
    NotificationSent BIT DEFAULT 0,
    NotificationDate DATETIME,
    ReminderSent BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ViolationID) REFERENCES Violations(ViolationID),
    FOREIGN KEY (VehicleID) REFERENCES Vehicles(VehicleID),
    FOREIGN KEY (IssuedByOfficerID) REFERENCES Officers(OfficerID)
);
GO

-- ============================================================================
-- TABLE: TrafficEvents
-- ============================================================================
CREATE TABLE TrafficEvents (
    TrafficEventID INT PRIMARY KEY IDENTITY(1,1),
    LocationID INT NOT NULL,
    EventType NVARCHAR(100) CHECK (EventType IN ('Congestion', 'Accident', 'Construction', 'Event', 'Weather', 'Maintenance', 'Other')),
    Severity NVARCHAR(50) CHECK (Severity IN ('Low', 'Medium', 'High', 'Critical')),
    Description NVARCHAR(500),
    StartTime DATETIME,
    EndTime DATETIME,
    AffectedLanes INT DEFAULT 1,
    EstimatedDelay INT, -- in minutes
    ImageURL NVARCHAR(500),
    ReportedBy INT, -- OfficerID
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (LocationID) REFERENCES Locations(LocationID),
    FOREIGN KEY (ReportedBy) REFERENCES Officers(OfficerID)
);
GO

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX IDX_Users_Email ON Users(Email);
CREATE INDEX IDX_Users_Role ON Users(Role);
CREATE INDEX IDX_Officers_UserID ON Officers(UserID);
CREATE INDEX IDX_Officers_BadgeNumber ON Officers(BadgeNumber);
CREATE INDEX IDX_Vehicles_RegistrationNumber ON Vehicles(RegistrationNumber);
CREATE INDEX IDX_Violations_VehicleID ON Violations(VehicleID);
CREATE INDEX IDX_Violations_LocationID ON Violations(LocationID);
CREATE INDEX IDX_Violations_ViolationDateTime ON Violations(ViolationDateTime);
CREATE INDEX IDX_Challans_ChallanNumber ON Challans(ChallanNumber);
CREATE INDEX IDX_Challans_VehicleID ON Challans(VehicleID);
CREATE INDEX IDX_Challans_ChallanStatus ON Challans(ChallanStatus);
CREATE INDEX IDX_Challans_PaymentStatus ON Challans(PaymentStatus);
CREATE INDEX IDX_TrafficEvents_LocationID ON TrafficEvents(LocationID);
CREATE INDEX IDX_TrafficEvents_EventType ON TrafficEvents(EventType);

GO

-- ============================================================================
-- Insert Sample Data
-- ============================================================================

-- Insert Admin User
INSERT INTO Users (Username, Email, PasswordHash, FirstName, LastName, Role, PhoneNumber, City, Country)
VALUES ('admin', 'admin@traffic.gov', '$2a$10$sample.hash.for.password', 'Admin', 'User', 'Admin', '1234567890', 'USA City', 'USA');

-- Insert Sample Officers
INSERT INTO Users (Username, Email, PasswordHash, FirstName, LastName, Role, PhoneNumber)
VALUES
    ('officer1', 'officer1@traffic.gov', '$2a$10$eNg891LPWYNvverXm2wHFuSAErtlnqw8/uZk7WNs4ProQCBjtV4.e', 'Shafiq', 'Rana', 'Officer', '9876543210'),
    ('officer2', 'officer2@traffic.gov', '$2a$10$eNg891LPWYNvverXm2wHFuSAErtlnqw8/uZk7WNs4ProQCBjtV4.e', 'Ayesha', 'Khan', 'Officer', '9876543211'),
    ('officer3', 'officer3@traffic.gov', '$2a$10$eNg891LPWYNvverXm2wHFuSAErtlnqw8/uZk7WNs4ProQCBjtV4.e', 'Bilal', 'Ahmed', 'Officer', '9876543212');

INSERT INTO Officers (UserID, BadgeNumber, Rank, Department, AssignedZone)
VALUES
    (2, 'OP001', 'Traffic Police Officer', 'Traffic Management', 'Karachi Central'),
    (3, 'OP002', 'Traffic Police Officer', 'Traffic Management', 'Saddar'),
    (4, 'OP003', 'Traffic Police Officer', 'Traffic Management', 'Gulshan-e-Iqbal');

-- Insert Sample Locations
INSERT INTO Locations (LocationName, Latitude, Longitude, CityName, ZoneType, SpeedLimit)
VALUES
    ('Shahrah-e-Faisal', 24.8607, 67.0011, 'Karachi', 'Main Road', 60),
    ('M.A. Jinnah Road', 24.8738, 67.0321, 'Karachi', 'Main Road', 50),
    ('University Road', 24.9180, 67.0971, 'Karachi', 'School Zone', 40);

-- Insert Sample Cameras
INSERT INTO Cameras (LocationID, CameraName, CameraType, Status)
VALUES
    (1, 'Camera-001', 'Speed', 'Active'),
    (2, 'Camera-002', 'Red Light', 'Active'),
    (3, 'Camera-003', 'Speed', 'Active');

-- Insert Sample Vehicle
INSERT INTO Vehicles (RegistrationNumber, VehicleType, Make, Model, Color, ManufactureYear, OwnerName, OwnerPhone)
VALUES ('ABC123', 'Car', 'Toyota', 'Camry', 'White', 2020, 'John Doe', '5551234567');

GO

PRINT 'Database setup completed successfully!';
PRINT 'Connected with: sa / sobaannajmi';
PRINT 'Database: TrafficManagementSystem';

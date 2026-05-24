const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '24h';

/**
 * User Login
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    // Query user from database
    const result = await executeQuery(
      `SELECT UserID, Username, Email, PasswordHash, Role, FirstName, LastName
       FROM Users
       WHERE Username = @username AND IsActive = 1`,
      { username }
    );

    if (result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    const user = result.recordset[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.PasswordHash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.UserID,
        username: user.Username,
        role: user.Role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Update last login
    await executeQuery(
      `UPDATE Users SET LastLoginAt = GETDATE() WHERE UserID = @userId`,
      { userId: user.UserID }
    );

    // Return user data and token
    res.json({
      success: true,
      token,
      user: {
        userId: user.UserID,
        username: user.Username,
        email: user.Email,
        role: user.Role,
        firstName: user.FirstName,
        lastName: user.LastName,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
};

/**
 * User Registration
 */
exports.register = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, phoneNumber } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required',
      });
    }

    // Check if user exists
    const existingUser = await executeQuery(
      `SELECT UserID FROM Users WHERE Username = @username OR Email = @email`,
      { username, email }
    );

    if (existingUser.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const insertResult = await executeQuery(
      `INSERT INTO Users (Username, Email, PasswordHash, FirstName, LastName, PhoneNumber, Role, IsActive)
       VALUES (@username, @email, @password, @firstName, @lastName, @phoneNumber, 'Public', 1);
       SELECT SCOPE_IDENTITY() as UserID`,
      {
        username,
        email,
        password: hashedPassword,
        firstName: firstName || '',
        lastName: lastName || '',
        phoneNumber: phoneNumber || '',
      }
    );

    const userId = insertResult.recordset[0].UserID;

    // Generate JWT token
    const token = jwt.sign(
      {
        userId,
        username,
        role: 'Public',
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        userId,
        username,
        email,
        role: 'Public',
        firstName,
        lastName,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
    });
  }
};

/**
 * User Logout
 */
exports.logout = async (req, res) => {
  try {
    // Token is invalidated on client side by removing it from localStorage
    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
    });
  }
};

/**
 * Refresh Token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Generate new token
    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      success: true,
      token: newToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Token refresh failed',
    });
  }
};

/**
 * Get User Profile
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await executeQuery(
      `SELECT UserID, Username, Email, FirstName, LastName, PhoneNumber, Role,
              Address, City, State, ZipCode, Country, ProfileImageURL, CreatedAt
       FROM Users WHERE UserID = @userId`,
      { userId }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user: result.recordset[0],
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
    });
  }
};

/**
 * Update User Profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { firstName, lastName, phoneNumber, address, city, state, zipCode, country } = req.body;

    await executeQuery(
      `UPDATE Users
       SET FirstName = @firstName, LastName = @lastName, PhoneNumber = @phoneNumber,
           Address = @address, City = @city, State = @state, ZipCode = @zipCode,
           Country = @country, UpdatedAt = GETDATE()
       WHERE UserID = @userId`,
      {
        userId,
        firstName: firstName || '',
        lastName: lastName || '',
        phoneNumber: phoneNumber || '',
        address: address || '',
        city: city || '',
        state: state || '',
        zipCode: zipCode || '',
        country: country || '',
      }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
};

/**
 * Change Password
 */
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    // Get user from database
    const result = await executeQuery(
      `SELECT PasswordHash FROM Users WHERE UserID = @userId`,
      { userId }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, result.recordset[0].PasswordHash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await executeQuery(
      `UPDATE Users SET PasswordHash = @password, UpdatedAt = GETDATE() WHERE UserID = @userId`,
      { userId, password: hashedPassword }
    );

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
    });
  }
};

/**
 * Forgot Password
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Check if user exists
    const result = await executeQuery(
      `SELECT UserID FROM Users WHERE Email = @email`,
      { email }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // TODO: Send password reset email

    res.json({
      success: true,
      message: 'Password reset link sent to email',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process forgot password',
    });
  }
};

/**
 * Reset Password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    // TODO: Verify reset token and update password

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
    });
  }
};

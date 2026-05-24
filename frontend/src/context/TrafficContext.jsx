import React, { createContext, useReducer, useCallback } from 'react';

export const TrafficContext = createContext();

const initialState = {
  trafficData: [],
  jams: [],
  events: [],
  selectedLocation: null,
  loading: false,
  error: null,
  filters: {
    severity: 'all',
    type: 'all',
    radius: 5000,
  },
};

function trafficReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        trafficData: action.payload.data,
        jams: action.payload.jams,
        events: action.payload.events,
        loading: false,
      };
    case 'FETCH_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_LOCATION':
      return { ...state, selectedLocation: action.payload };
    case 'SET_FILTER':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };
    case 'ADD_EVENT':
      return {
        ...state,
        events: [action.payload, ...state.events],
      };
    case 'UPDATE_JAM':
      return {
        ...state,
        jams: state.jams.map((jam) =>
          jam.id === action.payload.id ? action.payload : jam
        ),
      };
    default:
      return state;
  }
}

export const TrafficProvider = ({ children }) => {
  const [state, dispatch] = useReducer(trafficReducer, initialState);

  const fetchTrafficData = useCallback(async (filters) => {
    dispatch({ type: 'FETCH_START' });
    try {
      // Simulate API call
      const mockData = {
        data: [
          {
            id: 1,
            location: 'Shahrah-e-Faisal',
            congestionLevel: 75,
            avgSpeed: 15,
          },
        ],
        jams: [
          {
            id: 1,
            location: 'M.A. Jinnah Road',
            severity: 'High',
            estimatedDuration: 45,
            affectedLanes: 3,
          },
        ],
        events: [
          {
            id: 1,
            type: 'Accident',
            location: 'Karachi Saddar',
            severity: 'Critical',
            time: new Date(),
          },
        ],
      };

      dispatch({ type: 'FETCH_SUCCESS', payload: mockData });
    } catch (error) {
      dispatch({
        type: 'FETCH_ERROR',
        payload: error.message,
      });
    }
  }, []);

  const setSelectedLocation = useCallback((location) => {
    dispatch({ type: 'SET_LOCATION', payload: location });
  }, []);

  const setFilters = useCallback((filters) => {
    dispatch({ type: 'SET_FILTER', payload: filters });
  }, []);

  const addTrafficEvent = useCallback((event) => {
    dispatch({ type: 'ADD_EVENT', payload: event });
  }, []);

  const updateJam = useCallback((jam) => {
    dispatch({ type: 'UPDATE_JAM', payload: jam });
  }, []);

  const value = {
    ...state,
    fetchTrafficData,
    setSelectedLocation,
    setFilters,
    addTrafficEvent,
    updateJam,
  };

  return (
    <TrafficContext.Provider value={value}>{children}</TrafficContext.Provider>
  );
};

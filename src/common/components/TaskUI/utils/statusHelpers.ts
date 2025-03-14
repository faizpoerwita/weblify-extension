import { ActionStatus, ActionType, ACTION_STATUSES } from '../constants/actionConstants';

// Fungsi untuk mendapatkan warna berdasarkan status
export const getStatusColor = (status: ActionStatus, action?: ActionType): string => {
  if (!action) {
    switch (status) {
      case ACTION_STATUSES.RUNNING:
        return 'blue.500';
      case ACTION_STATUSES.SUCCESS:
        return 'green.500';
      case ACTION_STATUSES.ERROR:
        return 'red.500';
      case ACTION_STATUSES.WARNING:
        return 'orange.500';
      case ACTION_STATUSES.WAITING:
        return 'purple.500';
      case ACTION_STATUSES.DEBUG:
        return 'gray.500';
      default:
        return 'gray.400';
    }
  }

  // Special color cases for specific actions
  if (action.name === 'navigate') {
    switch (status) {
      case ACTION_STATUSES.RUNNING:
        return 'blue.500';
      case ACTION_STATUSES.SUCCESS:
        return 'green.500';
      case ACTION_STATUSES.ERROR:
        return 'red.500';
      case ACTION_STATUSES.WARNING:
        return 'orange.500';
      case ACTION_STATUSES.WAITING:
        return 'purple.500';
      default:
        return 'gray.400';
    }
  }

  if (action.name === 'click') {
    switch (status) {
      case ACTION_STATUSES.RUNNING:
        return 'blue.500';
      case ACTION_STATUSES.SUCCESS:
        return 'green.500';
      case ACTION_STATUSES.ERROR:
        return 'red.500';
      case ACTION_STATUSES.WARNING:
        return 'orange.500';
      case ACTION_STATUSES.WAITING:
        return 'purple.500';
      default:
        return 'gray.400';
    }
  }

  // Default colors for other actions
  switch (status) {
    case ACTION_STATUSES.RUNNING:
      return 'blue.500';
    case ACTION_STATUSES.SUCCESS:
      return 'green.500';
    case ACTION_STATUSES.ERROR:
      return 'red.500';
    case ACTION_STATUSES.WARNING:
      return 'orange.500';
    case ACTION_STATUSES.WAITING:
      return 'purple.500';
    default:
      return 'gray.400';
  }
}; 
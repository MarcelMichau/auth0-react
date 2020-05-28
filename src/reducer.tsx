import { AuthState, User } from './auth-state';

type Action =
  | { type: 'LOGIN_POPUP_STARTED' }
  | {
      type: 'INITIALISED' | 'LOGIN_POPUP_COMPLETE';
      isAuthenticated: boolean;
      user?: User;
    }
  | { type: 'ERROR'; error: Error };

export const reducer = (state: AuthState, action: Action): AuthState => {
  switch (action.type) {
    case 'LOGIN_POPUP_STARTED':
      return {
        ...state,
        isReady: false,
      };
    case 'LOGIN_POPUP_COMPLETE':
    case 'INITIALISED':
      return {
        ...state,
        isAuthenticated: action.isAuthenticated,
        user: action.user,
        isReady: true,
      };
    case 'ERROR':
      return {
        ...state,
        isReady: true,
        error: action.error,
      };
  }
};

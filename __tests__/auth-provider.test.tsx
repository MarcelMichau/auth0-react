import { useContext } from 'react';
import { mocked } from 'ts-jest/utils';
import Auth0Context from '../src/auth0-context';
import { renderHook, act } from '@testing-library/react-hooks';
import { Auth0Client } from '@auth0/auth0-spa-js';
import { createWrapper } from './helpers';

const clientMock = mocked(new Auth0Client({ client_id: '', domain: '' }));

describe('Auth0Provider', () => {
  it('should provide the Auth0Provider result', async () => {
    const wrapper = createWrapper();
    const { result, waitForNextUpdate } = renderHook(
      () => useContext(Auth0Context),
      { wrapper }
    );
    expect(result.current).toBeDefined();
    await waitForNextUpdate();
  });

  it('should configure an instance of the Auth0Client', async () => {
    const opts = {
      client_id: 'foo',
      domain: 'bar',
    };
    const wrapper = createWrapper(opts);
    const { waitForNextUpdate } = renderHook(() => useContext(Auth0Context), {
      wrapper,
    });
    expect(Auth0Client).toHaveBeenCalledWith(opts);
    await waitForNextUpdate();
  });

  it('should get token silently when logged out', async () => {
    const wrapper = createWrapper();
    const { waitForNextUpdate, result } = renderHook(
      () => useContext(Auth0Context),
      { wrapper }
    );
    expect(result.current.isReady).toBe(false);
    await waitForNextUpdate();
    expect(result.current.isReady).toBe(true);
    expect(clientMock.getTokenSilently).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should get token silently when logged in', async () => {
    clientMock.isAuthenticated.mockResolvedValue(true);
    clientMock.getUser.mockResolvedValue('__test_user__');
    const wrapper = createWrapper();
    const { waitForNextUpdate, result } = renderHook(
      () => useContext(Auth0Context),
      { wrapper }
    );
    await waitForNextUpdate();
    expect(clientMock.getTokenSilently).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toBe('__test_user__');
  });

  it('should handle login_required errors when getting token', async () => {
    clientMock.getTokenSilently.mockRejectedValue({
      error: 'login_required',
    });
    const wrapper = createWrapper();
    const { waitForNextUpdate, result } = renderHook(
      () => useContext(Auth0Context),
      { wrapper }
    );
    await waitForNextUpdate();
    expect(clientMock.getTokenSilently).toHaveBeenCalled();
    expect(result.current.error).toBeUndefined();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should handle other errors when getting token', async () => {
    clientMock.getTokenSilently.mockRejectedValue({
      error_description: '__test_error__',
    });
    const wrapper = createWrapper();
    const { waitForNextUpdate, result } = renderHook(
      () => useContext(Auth0Context),
      { wrapper }
    );
    await waitForNextUpdate();
    expect(clientMock.getTokenSilently).toHaveBeenCalled();
    expect(() => {
      throw result.current.error;
    }).toThrowError('__test_error__');
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should handle redirect callback success and clear the url', async () => {
    window.history.pushState(
      {},
      document.title,
      '/?code=__test_code__&state=__test_state__'
    );
    expect(window.location.href).toBe(
      'https://www.example.com/?code=__test_code__&state=__test_state__'
    );
    const wrapper = createWrapper();
    const { waitForNextUpdate } = renderHook(() => useContext(Auth0Context), {
      wrapper,
    });
    await waitForNextUpdate();
    expect(clientMock.handleRedirectCallback).toHaveBeenCalled();
    expect(window.location.href).toBe('https://www.example.com/');
  });

  it('should handle redirect callback errors', async () => {
    window.history.pushState({}, document.title, '/?error=__test_error__');
    clientMock.handleRedirectCallback.mockRejectedValue(
      new Error('__test_error__')
    );
    const wrapper = createWrapper();
    const { waitForNextUpdate, result } = renderHook(
      () => useContext(Auth0Context),
      { wrapper }
    );
    await waitForNextUpdate();
    expect(clientMock.handleRedirectCallback).toHaveBeenCalled();
    expect(() => {
      throw result.current.error;
    }).toThrowError('__test_error__');
  });

  it('should handle redirect and call a custom handler', async () => {
    window.history.pushState(
      {},
      document.title,
      '/?code=__test_code__&state=__test_state__'
    );
    clientMock.handleRedirectCallback.mockResolvedValue({
      appState: { foo: 'bar' },
    });
    const onRedirectCallback = jest.fn();
    const wrapper = createWrapper({
      onRedirectCallback,
    });
    const { waitForNextUpdate } = renderHook(() => useContext(Auth0Context), {
      wrapper,
    });
    await waitForNextUpdate();
    expect(onRedirectCallback).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('should login with a popup', async () => {
    clientMock.isAuthenticated.mockResolvedValue(false);
    const wrapper = createWrapper();
    const { waitForNextUpdate, result } = renderHook(
      () => useContext(Auth0Context),
      { wrapper }
    );
    await waitForNextUpdate();
    expect(result.current.isAuthenticated).toBe(false);
    clientMock.isAuthenticated.mockResolvedValue(true);
    act(() => {
      result.current.loginWithPopup();
    });
    expect(result.current.isReady).toBe(false);
    await waitForNextUpdate();
    expect(result.current.isReady).toBe(true);
    expect(clientMock.loginWithPopup).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle errors when logging in with a popup', async () => {
    clientMock.isAuthenticated.mockResolvedValue(false);
    const wrapper = createWrapper();
    const { waitForNextUpdate, result } = renderHook(
      () => useContext(Auth0Context),
      { wrapper }
    );
    await waitForNextUpdate();
    expect(result.current.isAuthenticated).toBe(false);
    clientMock.isAuthenticated.mockResolvedValue(false);
    clientMock.loginWithPopup.mockRejectedValue(new Error('__test_error__'));
    act(() => {
      result.current.loginWithPopup();
    });
    expect(result.current.isReady).toBe(false);
    await waitForNextUpdate();
    expect(result.current.isReady).toBe(true);
    expect(clientMock.loginWithPopup).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(() => {
      throw result.current.error;
    }).toThrowError('__test_error__');
  });

  it('should provide a login method', async () => {
    const wrapper = createWrapper();
    const { waitForNextUpdate, result } = renderHook(
      () => useContext(Auth0Context),
      { wrapper }
    );
    await waitForNextUpdate();
    expect(result.current.loginWithRedirect).toBeInstanceOf(Function);
    await result.current.loginWithRedirect({
      redirect_uri: '__redirect_uri__',
    });
    expect(clientMock.loginWithRedirect).toHaveBeenCalledWith({
      redirect_uri: '__redirect_uri__',
    });
  });

  it('should provide a logout method', async () => {
    const wrapper = createWrapper();
    const { waitForNextUpdate, result } = renderHook(
      () => useContext(Auth0Context),
      { wrapper }
    );
    await waitForNextUpdate();
    expect(result.current.logout).toBeInstanceOf(Function);
    await result.current.logout({ returnTo: '__return_to__' });
    expect(clientMock.logout).toHaveBeenCalledWith({
      returnTo: '__return_to__',
    });
  });

  it('should provide a getAccessTokenSilently method', async () => {
    clientMock.getTokenSilently.mockResolvedValue('token');
    const wrapper = createWrapper();
    const { waitForNextUpdate, result } = renderHook(
      () => useContext(Auth0Context),
      { wrapper }
    );
    await waitForNextUpdate();
    expect(result.current.getAccessTokenSilently).toBeInstanceOf(Function);
    const token = await result.current.getAccessTokenSilently();
    expect(clientMock.getTokenSilently).toHaveBeenCalled();
    expect(token).toBe('token');
  });

  it('should provide a getAccessTokenWithPopup method', async () => {
    clientMock.getTokenWithPopup.mockResolvedValue('token');
    const wrapper = createWrapper();
    const { waitForNextUpdate, result } = renderHook(
      () => useContext(Auth0Context),
      { wrapper }
    );
    await waitForNextUpdate();
    expect(result.current.getAccessTokenWithPopup).toBeInstanceOf(Function);
    const token = await result.current.getAccessTokenWithPopup();
    expect(clientMock.getTokenWithPopup).toHaveBeenCalled();
    expect(token).toBe('token');
  });

  it('should provide a getIdTokenClaims method', async () => {
    clientMock.getIdTokenClaims.mockResolvedValue({
      claim: '__test_claim__',
      __raw: '__test_raw_token__',
    });
    const wrapper = createWrapper();
    const { waitForNextUpdate, result } = renderHook(
      () => useContext(Auth0Context),
      { wrapper }
    );
    await waitForNextUpdate();
    expect(result.current.getIdTokenClaims).toBeInstanceOf(Function);
    const claims = await result.current.getIdTokenClaims();
    expect(clientMock.getIdTokenClaims).toHaveBeenCalled();
    expect(claims).toStrictEqual({
      claim: '__test_claim__',
      __raw: '__test_raw_token__',
    });
  });
});

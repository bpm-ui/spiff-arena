import jwt from 'jwt-decode';
import cookie from 'cookie';
import { BACKEND_BASE_URL } from '../config';

// NOTE: this currently stores the jwt token in local storage
// which is considered insecure. Server set cookies seem to be considered
// the most secure but they require both frontend and backend to be on the same
// domain which we probably can't guarantee. We could also use cookies directly
// but they have the same XSS issues as local storage.
//
// Some explanation:
// https://dev.to/nilanth/how-to-secure-jwt-in-a-single-page-application-cko

const getCookie = (key: string) => {
  const parsedCookies = cookie.parse(document.cookie);
  if (key in parsedCookies) {
    return parsedCookies[key];
  }
  return null;
};

const getCurrentLocation = (queryParams: string = window.location.search) => {
  let queryParamString = '';
  if (queryParams) {
    queryParamString = `${queryParams}`;
  }
  return encodeURIComponent(
    `${window.location.origin}${window.location.pathname}${queryParamString}`
  );
};

const checkPathForTaskShowParams = () => {
  // expected url pattern:
  // /tasks/[process_instance_id]/[task_guid]
  const pathSegments = window.location.pathname.match(
    /^\/tasks\/(\d+)\/([0-9a-z]{8}-([0-9a-z]{4}-){3}[0-9a-z]{12})$/
  );
  if (pathSegments) {
    return { process_instance_id: pathSegments[1], task_guid: pathSegments[2] };
  }
  return null;
};

const doLogin = () => {
  const taskShowParams = checkPathForTaskShowParams();
  const loginParams = [`redirect_url=${getCurrentLocation()}`];
  if (taskShowParams) {
    loginParams.push(
      `process_instance_id=${taskShowParams.process_instance_id}`
    );
    loginParams.push(`task_guid=${taskShowParams.task_guid}`);
  }
  const url = `${BACKEND_BASE_URL}/login?${loginParams.join('&')}`;
  window.location.href = url;
};

// required for logging out
const getIdToken = () => {
  return getCookie('id_token');
};

const doLogout = () => {
  const idToken = getIdToken();
  const redirectUrl = `${window.location.origin}`;
  const url = `${BACKEND_BASE_URL}/logout?redirect_url=${redirectUrl}&id_token=${idToken}`;
  window.location.href = url;
};

const getAccessToken = () => {
  return getCookie('access_token');
};
const isLoggedIn = () => {
  return !!getAccessToken();
};

const getUserEmail = () => {
  const idToken = getIdToken();
  if (idToken) {
    const idObject = jwt(idToken);
    return (idObject as any).email;
  }
  return null;
};

const authenticationDisabled = () => {
  const idToken = getIdToken();
  if (idToken) {
    const idObject = jwt(idToken);
    return (idObject as any).authentication_disabled;
  }
  return false;
};

const onlyGuestTaskCompletion = () => {
  const idToken = getIdToken();
  if (idToken) {
    const idObject = jwt(idToken);
    return (idObject as any).only_guest_task_completion;
  }
  return false;
};

/**
 * Return prefered username
 * Somehow if using Google as the OpenID provider, the field `preferred_username` is not returned
 * therefore a special handling is added to cover the issue.
 * Please refer to following link, section 5.1 Standard Claims to find the details:
 * https://openid.net/specs/openid-connect-core-1_0.html
 * @returns string
 */
const getPreferredUsername = () => {
  const idToken = getIdToken();
  if (idToken) {
    const idObject = jwt(idToken);

    if (idToken === undefined || idToken === 'undefined') {
      return null;
    }

    if ((idObject as any).preferred_username !== undefined) {
      return (idObject as any).preferred_username;
    }

    if ((idObject as any).name !== undefined) {
      // note: handling response if OpenID is using Google SSO as the provider
      return (idObject as any).name;
    }

    // fallback to `given_name` as the default value.
    return (idObject as any).given_name;
  }

  return null;
};

const loginIfNeeded = () => {
  if (!isLoggedIn()) {
    doLogin();
  }
};

const UserService = {
  authenticationDisabled,
  doLogin,
  doLogout,
  getAccessToken,
  getPreferredUsername,
  getUserEmail,
  isLoggedIn,
  loginIfNeeded,
  onlyGuestTaskCompletion,
};

export default UserService;

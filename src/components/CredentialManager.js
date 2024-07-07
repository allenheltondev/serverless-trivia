/**
 * Saves the credentials for a given game in the session storage.
 *
 * @param {string} gameId - The identifier for the game.
 * @param {Object} credentials - The credentials object.
 * @param {string} [credentials.token] - The token for the game, if any.
 * @param {string} [credentials.passKey] - The pass key for the game, if any.
 * @param {string} [credentials.username] - The player's username
 * @param {string} [credentials.team] - The player's team name
 */
export const saveCredentials = (gameId, credentials) => {
  sessionStorage.setItem(gameId, JSON.stringify({
    ...credentials.token && {token: credentials.token},
    ...credentials.passKey && { passKey: credentials.passKey},
    ...credentials.username && { username: credentials.username},
    ...credentials.team && { team: credentials.team}
  }));
}

/**
 * Loads the credentials for a given game from the session storage.
 *
 * @param {string} gameId - The identifier for the game.
 * @returns {Object|null} The credentials object if found, otherwise null.
 * @returns {string} [return.token] - The token for the game, if any.
 * @returns {string} [return.passKey] - The pass key for the game, if any.
 * @returns {string} [return.username] - The player's username
 * @returns {string} [return.team] - The player's team name
 */
export const loadCredentials = (gameId) => {
  const credentials = sessionStorage.getItem(gameId);
  if (credentials) {
    return JSON.parse(credentials);
  }
  return null;
}

/**
 * 
 * @param {string} url 
 * @param {Object} requestOptions 
 * @param {Function} callback 
 */
export async function CRUD(url, requestOptions, callback){
  await fetch(url, requestOptions)
    .then(response => response.json())
    .then(result => callback(result))
    .catch(error => callback({remarks:"error","message":error}));
}

/**
 * 
 * @param {string} data 
 */
export async function encrypt(data){
  return btoa(data);
}

/**
 * 
 * @param {string} data 
 */
export async function decrypt(data){
  return atob(data);
}

/**
 * 
 * @param {number} length 
 */
export function generatePassword(length = 8) {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+[]{}|;:,.<>?";

  const allChars = lower + upper + numbers + symbols;
  let password = "";

  password += lower[Math.floor(Math.random() * lower.length)];
  password += upper[Math.floor(Math.random() * upper.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

/**
 * 
 * @param {any} data 
 */
export function isEmpty(data) {
  if (data == null) return true;
  if (typeof data === "string") return data.trim().length === 0;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === "object") return Object.keys(data).length === 0;
  if (data instanceof Map || data instanceof Set) return data.size === 0;
  return false;
}
